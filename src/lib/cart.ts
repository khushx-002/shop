/**
 * Server-side cart (database backed). A random token in the httpOnly cookie "jm_cart"
 * identifies the cart; logged-in users also have cart.user_id set so the cart follows them.
 *
 * Prices and stock are always read live from the database, never from the browser.
 * getCartTotals() is the single source of truth used by the cart page AND checkout.
 */
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema, type Db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { readSettings } from "@/lib/settings";
import { amountToFreeShipping, evaluateCoupon, resolveZone, shippingOptions, subtotalOf, type ZoneWithRates } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import type { CartLine, CartView, ShippingOptionView } from "@/lib/types";

export const CART_COOKIE = "jm_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type CartRow = typeof schema.carts.$inferSelect;

export class CartError extends Error {}

async function readToken(): Promise<string | null> {
  const jar = await cookies();
  const t = jar.get(CART_COOKIE)?.value;
  return t && /^[A-Za-z0-9_-]{20,64}$/.test(t) ? t : null;
}

/** Cookies can only be written in Route Handlers / Server Actions; while rendering a page this is skipped. */
async function writeToken(token: string) {
  const jar = await cookies();
  try {
    jar.set(CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: CART_MAX_AGE });
  } catch {
    /* page render: the browser's next /api/cart/ call sets the cookie */
  }
}

/** Finds the current cart (by cookie, or the logged-in user's latest cart). Optionally creates one. */
export async function findCart(db: Db, opts: { create: boolean; user?: SessionUser | null }): Promise<CartRow | null> {
  const user = opts.user === undefined ? await getSessionUser() : opts.user;
  const token = await readToken();
  let cart: CartRow | undefined;
  if (token) cart = await db.query.carts.findFirst({ where: eq(schema.carts.token, token) });
  if (cart && cart.userId && user && cart.userId !== user.id) cart = undefined; // never use someone else's cart
  if (cart && cart.userId && !user) cart = undefined; // logged-out visitor must not see a user's cart
  if (!cart && user) {
    cart = await db.query.carts.findFirst({ where: eq(schema.carts.userId, user.id), orderBy: (c, { desc }) => [desc(c.updatedAt)] });
    if (cart) await writeToken(cart.token);
  }
  if (cart && user && !cart.userId) {
    await db.update(schema.carts).set({ userId: user.id, updatedAt: new Date() }).where(eq(schema.carts.id, cart.id));
    cart = { ...cart, userId: user.id };
  }
  if (!cart && opts.create) {
    const newToken = randomBytes(24).toString("base64url");
    const [row] = await db.insert(schema.carts).values({ token: newToken, userId: user?.id ?? null }).returning();
    cart = row;
    await writeToken(newToken);
  }
  return cart ?? null;
}

async function loadZones(db: Db): Promise<ZoneWithRates[]> {
  return db.query.shippingZones.findMany({ with: { rates: true } });
}

export type CartTotals = {
  lines: CartLine[];
  removed: string[];
  subtotalPaise: number;
  discountPaise: number;
  coupon: { code: string; description: string | null; freeShipping: boolean } | null;
  couponError: string | null;
  shippingOptions: ShippingOptionView[];
  shipping: ShippingOptionView | null;
  shippingAvailable: boolean;
  zoneName: string | null;
  /** "Cash on delivery" can be chosen (the address's zone allows it and has a shipping method). */
  codAvailable: boolean;
  /** The zone's "Sorry! COD ... not available" text, shown when COD is off there (null = no box). */
  codNotice: string | null;
  totalPaise: number;
  freeShippingThresholdPaise: number | null;
};

/**
 * Computes everything about a cart from live data. Used by the cart API and by checkout.
 * `destination` overrides the cart's saved shipping state/postcode (checkout passes the form address).
 */
export async function getCartTotals(
  db: Db,
  cart: CartRow | null,
  destination?: { state: string; postcode: string } | null,
  customerEmail?: string | null,
): Promise<CartTotals> {
  const settings = await readSettings();
  const empty: CartTotals = {
    lines: [],
    removed: [],
    subtotalPaise: 0,
    discountPaise: 0,
    coupon: null,
    couponError: null,
    shippingOptions: [],
    shipping: null,
    shippingAvailable: true,
    zoneName: null,
    codAvailable: false,
    codNotice: null,
    totalPaise: 0,
    freeShippingThresholdPaise: settings.free_shipping_threshold_paise,
  };
  if (!cart) return empty;
  const items = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id)).orderBy(schema.cartItems.addedAt, schema.cartItems.id);
  if (!items.length) return { ...empty, coupon: null };
  const vars = await db.query.variations.findMany({
    where: inArray(schema.variations.id, items.map((i) => i.variationId)),
    with: { product: { with: { images: true } } },
  });
  const lines: CartLine[] = [];
  const removed: string[] = [];
  for (const it of items) {
    const v = vars.find((x) => x.id === it.variationId);
    const sellable = v && v.product.status === "publish" && v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0) && v.pricePaise > 0;
    if (!v || !sellable) {
      removed.push(v ? `${v.product.name} – ${v.valueLabel}` : "An item");
      await db.delete(schema.cartItems).where(eq(schema.cartItems.id, it.id));
      continue;
    }
    const maxQty = Math.min(settings.max_qty_per_line, v.manageStock ? Math.max(0, v.stockQty ?? 0) : settings.max_qty_per_line);
    const qty = Math.min(it.qty, maxQty);
    if (qty !== it.qty) await db.update(schema.cartItems).set({ qty }).where(eq(schema.cartItems.id, it.id));
    const firstImage = [...v.product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null;
    lines.push({
      variationId: v.id,
      productId: v.productId,
      slug: v.product.slug,
      href: routes.product(v.product.slug, { slug: v.attributeSlug, value: v.valueSlug }),
      name: v.product.name,
      variationLabel: v.valueLabel,
      attributeName: v.product.attributeName,
      image: v.image ?? firstImage,
      qty,
      unitPricePaise: v.pricePaise,
      regularPricePaise: v.regularPricePaise,
      lineTotalPaise: v.pricePaise * qty,
      inStock: true,
      maxQty,
    });
  }
  const subtotalPaise = subtotalOf(lines.map((l) => ({ variationId: l.variationId, qty: l.qty, unitPricePaise: l.unitPricePaise, inStock: true })));

  // coupon
  let discountPaise = 0;
  let coupon: CartTotals["coupon"] = null;
  let couponError: string | null = null;
  let couponFreeShipping = false;
  if (cart.couponCode) {
    const row = await db.query.coupons.findFirst({ where: sql`upper(${schema.coupons.code}) = upper(${cart.couponCode})` });
    let res = evaluateCoupon(row ?? null, subtotalPaise);
    const email = customerEmail?.trim().toLowerCase();
    if (res.ok && row?.perUserLimit != null && email) {
      const [used] = await db
        .select({ n: sql<number>`count(*)` })
        .from(schema.couponUsages)
        .where(and(eq(schema.couponUsages.couponId, row.id), sql`lower(${schema.couponUsages.email}) = ${email}`));
      if (Number(used?.n ?? 0) >= row.perUserLimit) res = { ok: false, reason: "You have already used this coupon the maximum number of times." };
    }
    if (res.ok) {
      discountPaise = res.discountPaise;
      couponFreeShipping = res.freeShipping;
      coupon = { code: res.coupon.code, description: res.coupon.description, freeShipping: res.freeShipping };
    } else {
      couponError = `Coupon "${cart.couponCode}" was removed: ${res.reason}`;
      await db.update(schema.carts).set({ couponCode: null }).where(eq(schema.carts.id, cart.id));
    }
  }

  // shipping
  const dest = destination ?? (cart.shippingState || cart.shippingPostcode ? { state: cart.shippingState ?? "", postcode: cart.shippingPostcode ?? "" } : null);
  const zones = await loadZones(db);
  let options: ShippingOptionView[] = [];
  let zoneName: string | null = null;
  let available = true;
  let codAvailable = false;
  let codNotice: string | null = null;
  const afterDiscount = Math.max(0, subtotalPaise - discountPaise);
  if (dest) {
    const zone = resolveZone(zones, dest.state, dest.postcode);
    zoneName = zone?.name ?? null;
    options = shippingOptions(zone, afterDiscount, couponFreeShipping).map((o) => ({ id: o.rateId ? `rate-${o.rateId}` : "free", label: o.label, costPaise: o.costPaise, type: o.type }));
    available = options.length > 0;
    // Like the old site: COD needs a zone that allows it and a shipping method; a zone without COD
    // may show its "Sorry! COD ..." box (also when it has no shipping method for this order).
    codAvailable = !!zone?.codEnabled && available;
    codNotice = zone && !zone.codEnabled ? zone.codUnavailableNotice?.trim() || null : null;
  }
  // No address yet: like WooCommerce on the old site, no shipping method or cost is shown and the
  // total is the products only ("Calculate shipping" in the cart, the address form at checkout).
  // Orders are never placed this way: placeOrder() always passes the validated form address and
  // refuses an order without a shipping method.
  const selected = options.length ? options.reduce((a, b) => (b.costPaise < a.costPaise ? b : a)) : null;
  const shippingPaise = selected?.costPaise ?? 0;
  return {
    lines,
    removed,
    subtotalPaise,
    discountPaise,
    coupon,
    couponError,
    shippingOptions: options,
    shipping: selected,
    shippingAvailable: available,
    zoneName,
    codAvailable,
    codNotice,
    totalPaise: Math.max(0, subtotalPaise - discountPaise) + shippingPaise,
    freeShippingThresholdPaise: settings.free_shipping_threshold_paise,
  };
}

function toView(cart: CartRow | null, t: CartTotals, user: SessionUser | null): CartView {
  const notices: string[] = [];
  if (t.removed.length) notices.push(`These items are no longer available and were removed from your cart: ${t.removed.join(", ")}.`);
  if (t.couponError) notices.push(t.couponError);
  const remaining = amountToFreeShipping(t.freeShippingThresholdPaise, Math.max(0, t.subtotalPaise - t.discountPaise));
  return {
    items: t.lines,
    itemCount: t.lines.reduce((s, l) => s + l.qty, 0),
    subtotalPaise: t.subtotalPaise,
    discountPaise: t.discountPaise,
    coupon: t.coupon,
    shipping: {
      destination: cart && (cart.shippingState || cart.shippingPostcode) ? { state: cart.shippingState ?? "", postcode: cart.shippingPostcode ?? "" } : null,
      options: t.shippingOptions,
      selected: t.shipping,
      costPaise: t.shipping?.costPaise ?? 0,
      available: t.shippingAvailable,
      zoneName: t.zoneName,
    },
    totalPaise: t.totalPaise,
    freeShipping: { thresholdPaise: t.freeShippingThresholdPaise, remainingPaise: remaining, reached: t.freeShippingThresholdPaise != null && remaining === 0 },
    notices,
    user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null,
  };
}

export async function getCartView(): Promise<CartView> {
  const db = await getDb();
  const user = await getSessionUser();
  const cart = await findCart(db, { create: false, user });
  return toView(cart, await getCartTotals(db, cart), user);
}

async function touch(db: Db, cartId: number) {
  const [row] = await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId)).returning({ token: schema.carts.token });
  if (row) await writeToken(row.token); // keep the 30-day cookie alive while the cart is in use
}

/** Adds a pack size to the cart (or increases its quantity). Throws CartError with a customer message. */
export async function addToCart(variationId: number, qty: number): Promise<CartView> {
  if (!Number.isInteger(variationId) || variationId <= 0) throw new CartError("Please choose a product option.");
  if (!Number.isInteger(qty) || qty < 1) throw new CartError("Please enter a valid quantity.");
  const db = await getDb();
  const user = await getSessionUser();
  const settings = await readSettings();
  const v = await db.query.variations.findFirst({ where: eq(schema.variations.id, variationId), with: { product: true } });
  if (!v || v.product.status !== "publish" || v.pricePaise <= 0) throw new CartError("This product is not available.");
  const available = v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0);
  if (!available) throw new CartError(`Sorry, "${v.product.name} – ${v.valueLabel}" is out of stock.`);
  const cart = (await findCart(db, { create: true, user }))!;
  const existing = await db.query.cartItems.findFirst({ where: and(eq(schema.cartItems.cartId, cart.id), eq(schema.cartItems.variationId, variationId)) });
  const maxQty = Math.min(settings.max_qty_per_line, v.manageStock ? v.stockQty ?? 0 : settings.max_qty_per_line);
  const newQty = (existing?.qty ?? 0) + qty;
  if (newQty > maxQty) {
    throw new CartError(
      v.manageStock && (v.stockQty ?? 0) < settings.max_qty_per_line
        ? `You cannot add that amount to the cart — we have ${v.stockQty} in stock and you already have ${existing?.qty ?? 0} in your cart.`
        : `You can buy at most ${maxQty} of "${v.product.name} – ${v.valueLabel}" in one order.`,
    );
  }
  if (existing) await db.update(schema.cartItems).set({ qty: newQty }).where(eq(schema.cartItems.id, existing.id));
  else await db.insert(schema.cartItems).values({ cartId: cart.id, variationId, qty: newQty });
  await touch(db, cart.id);
  return toView(cart, await getCartTotals(db, cart), user);
}

/** Sets the quantity of a line (0 removes it). */
export async function setCartQty(variationId: number, qty: number): Promise<CartView> {
  if (!Number.isInteger(qty) || qty < 0) throw new CartError("Please enter a valid quantity.");
  const db = await getDb();
  const user = await getSessionUser();
  const settings = await readSettings();
  const cart = await findCart(db, { create: false, user });
  if (!cart) throw new CartError("Your cart is empty.");
  const item = await db.query.cartItems.findFirst({ where: and(eq(schema.cartItems.cartId, cart.id), eq(schema.cartItems.variationId, variationId)) });
  if (!item) throw new CartError("That item is not in your cart.");
  if (qty === 0) {
    await db.delete(schema.cartItems).where(eq(schema.cartItems.id, item.id));
  } else {
    const v = await db.query.variations.findFirst({ where: eq(schema.variations.id, variationId) });
    const maxQty = Math.min(settings.max_qty_per_line, v?.manageStock ? v.stockQty ?? 0 : settings.max_qty_per_line);
    if (qty > maxQty) throw new CartError(`Only ${maxQty} can be ordered for this item.`);
    await db.update(schema.cartItems).set({ qty }).where(eq(schema.cartItems.id, item.id));
  }
  await touch(db, cart.id);
  return toView(cart, await getCartTotals(db, cart), user);
}

export async function removeFromCart(variationId: number): Promise<CartView> {
  return setCartQty(variationId, 0);
}

/** Applies a coupon code. Returns the cart and an error message if the coupon was refused. */
export async function applyCoupon(code: string): Promise<{ cart: CartView; error: string | null }> {
  const db = await getDb();
  const user = await getSessionUser();
  const cart = await findCart(db, { create: false, user });
  const clean = code.trim().toUpperCase();
  if (!clean) return { cart: await getCartView(), error: "Please enter a coupon code." };
  if (!cart) return { cart: await getCartView(), error: "Your cart is empty." };
  const totals = await getCartTotals(db, cart);
  if (!totals.lines.length) return { cart: toView(cart, totals, user), error: "Your cart is empty." };
  const row = await db.query.coupons.findFirst({ where: sql`upper(${schema.coupons.code}) = ${clean}` });
  if (!row) return { cart: toView(cart, totals, user), error: `Coupon "${clean}" does not exist!` };
  const res = evaluateCoupon(row, totals.subtotalPaise);
  if (!res.ok) return { cart: toView(cart, totals, user), error: res.reason };
  if (row.perUserLimit != null && user) {
    const used = await db.select({ n: sql<number>`count(*)` }).from(schema.couponUsages).where(and(eq(schema.couponUsages.couponId, row.id), sql`lower(${schema.couponUsages.email}) = lower(${user.email})`));
    if (Number(used[0]?.n ?? 0) >= row.perUserLimit) return { cart: toView(cart, totals, user), error: "You have already used this coupon." };
  }
  await db.update(schema.carts).set({ couponCode: row.code, updatedAt: new Date() }).where(eq(schema.carts.id, cart.id));
  const fresh = { ...cart, couponCode: row.code };
  return { cart: toView(fresh, await getCartTotals(db, fresh), user), error: null };
}

export async function removeCoupon(): Promise<CartView> {
  const db = await getDb();
  const user = await getSessionUser();
  const cart = await findCart(db, { create: false, user });
  if (cart) await db.update(schema.carts).set({ couponCode: null, updatedAt: new Date() }).where(eq(schema.carts.id, cart.id));
  const fresh = cart ? { ...cart, couponCode: null } : null;
  return toView(fresh, await getCartTotals(db, fresh), user);
}

/** Saves the shipping destination used by the cart page shipping calculator. */
export async function setCartDestination(state: string, postcode: string): Promise<CartView> {
  const db = await getDb();
  const user = await getSessionUser();
  const cart = await findCart(db, { create: true, user });
  await db.update(schema.carts).set({ shippingState: state.toUpperCase().slice(0, 8), shippingPostcode: postcode.replace(/\s+/g, "").slice(0, 12), updatedAt: new Date() }).where(eq(schema.carts.id, cart!.id));
  const fresh = { ...cart!, shippingState: state.toUpperCase(), shippingPostcode: postcode.replace(/\s+/g, "") };
  return toView(fresh, await getCartTotals(db, fresh), user);
}

/**
 * Called right after login: moves items from the visitor's cart into the user's cart.
 * Quantities are added together (capped by the per-line limit).
 */
export async function mergeCartsAfterLogin(userId: number): Promise<void> {
  const db = await getDb();
  const settings = await readSettings();
  const token = await readToken();
  const guest = token ? await db.query.carts.findFirst({ where: eq(schema.carts.token, token) }) : undefined;
  const userCart = await db.query.carts.findFirst({ where: eq(schema.carts.userId, userId), orderBy: (c, { desc }) => [desc(c.updatedAt)] });
  if (!guest || guest.userId === userId) {
    if (!guest && userCart) await writeToken(userCart.token);
    if (guest && !guest.userId) await db.update(schema.carts).set({ userId }).where(eq(schema.carts.id, guest.id));
    return;
  }
  if (guest.userId && guest.userId !== userId) {
    // The cookie points at another person's cart (shared computer): switch to this user's own cart.
    if (userCart) await writeToken(userCart.token);
    else {
      const t = randomBytes(24).toString("base64url");
      await db.insert(schema.carts).values({ token: t, userId });
      await writeToken(t);
    }
    return;
  }
  if (!userCart) {
    await db.update(schema.carts).set({ userId, updatedAt: new Date() }).where(eq(schema.carts.id, guest.id));
    return;
  }
  const guestItems = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, guest.id));
  for (const gi of guestItems) {
    const existing = await db.query.cartItems.findFirst({ where: and(eq(schema.cartItems.cartId, userCart.id), eq(schema.cartItems.variationId, gi.variationId)) });
    if (existing) await db.update(schema.cartItems).set({ qty: Math.min(settings.max_qty_per_line, existing.qty + gi.qty) }).where(eq(schema.cartItems.id, existing.id));
    else await db.insert(schema.cartItems).values({ cartId: userCart.id, variationId: gi.variationId, qty: Math.min(settings.max_qty_per_line, gi.qty) });
  }
  if (guest.couponCode && !userCart.couponCode) await db.update(schema.carts).set({ couponCode: guest.couponCode }).where(eq(schema.carts.id, userCart.id));
  await db.delete(schema.carts).where(eq(schema.carts.id, guest.id));
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, userCart.id));
  await writeToken(userCart.token);
}

/** Empties a cart after a successful order. */
export async function clearCart(db: Db, cartId: number): Promise<void> {
  await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cartId));
  await db.update(schema.carts).set({ couponCode: null, updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
}
