/**
 * Orders: create a pending order from the cart, take payment through Razorpay, mark it paid.
 * Server only (database). Totals ALWAYS come from getCartTotals() – never from the browser.
 *
 * Flow:
 *   placeOrder()       POST /api/checkout/          -> order "pending_payment" + Razorpay order
 *   (browser pays in the Razorpay popup)
 *   confirmPayment()   POST /api/checkout/verify/   -> checks signature + payment, then markOrderPaid()
 *   webhook            POST /api/razorpay/webhook/  -> markOrderPaid() if the browser was closed
 *   markOrderPaid()    idempotent: only the call that flips the status does the side effects.
 *
 * Cash on delivery (only in zones that allow it, checked again here): placeOrder() creates the order
 * and confirmCashOnDelivery() moves it straight to "processing" (like WooCommerce's COD), no payment.
 */
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getDb, schema, type Db } from "@/lib/db";
import type { OrderAddress } from "@/lib/db/schema";
import { clearCart, findCart, getCartTotals } from "@/lib/cart";
import type { SessionUser } from "@/lib/auth/session";
import { ensureCustomerAccount } from "@/lib/auth/accounts";
import { sendMail, adminEmail } from "@/lib/email";
import { adminNewOrderEmail, orderConfirmationEmail, type EmailOrder } from "@/lib/email-templates";
import { stateName } from "@/lib/india";
import { readSettings } from "@/lib/settings";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { capturePayment, createRazorpayOrder, fetchPayment, isRazorpayConfigured, publicKeyId, RazorpayError } from "@/lib/razorpay";
import type { PaymentMethodId } from "./payment-methods";
import { cartFingerprint, expectedMatches, formatCartRef, generateAccessToken, generateOrderNumber, parseCartRef, safeEqual, toReview } from "./helpers";
import { normalizeAddress, shippingDestination, isCompleteDestination, validateCheckoutFields } from "./validation";
import type { AddressInput, CheckoutApiResponse, CheckoutInput, CheckoutReview, PaymentParams } from "./types";

export type OrderRow = typeof schema.orders.$inferSelect;
export type OrderItemRow = typeof schema.orderItems.$inferSelect;

export const NOT_CONFIGURED_MESSAGE = "Online payment is not configured yet. Please contact info@jivo.in to place your order.";

async function addEvent(db: Db, orderId: number, type: string, message: string | null, actor = "system") {
  await db.insert(schema.orderEvents).values({ orderId, type, message: message?.slice(0, 2000) ?? null, actor });
}

function noShippingMessage(postcode: string): string {
  return `No shipping options were found for ${postcode || "your address"}. Please contact us at info@jivo.in.`;
}

/* ------------------------------------------------------------------ */
/* Checkout page data                                                  */
/* ------------------------------------------------------------------ */

export type CheckoutPrefill = { billing: AddressInput; shipping: AddressInput | null };

/** Saved addresses of a logged-in customer, in the shape of the checkout form. */
export async function loadPrefill(user: SessionUser | null): Promise<CheckoutPrefill> {
  const blank: AddressInput = { fullName: "", company: "", address1: "", address2: "", city: "", state: "", postcode: "", phone: "", email: "" };
  if (!user) return { billing: blank, shipping: null };
  const db = await getDb();
  const [rows, userRow] = await Promise.all([
    db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.updatedAt)),
    db.query.users.findFirst({ where: eq(schema.users.id, user.id) }),
  ]);
  const toInput = (a: (typeof rows)[number] | undefined, withContact: boolean): AddressInput | null =>
    a
      ? {
          fullName: a.fullName,
          company: a.company ?? "",
          address1: a.address1,
          address2: a.address2 ?? "",
          city: a.city,
          state: a.state,
          postcode: a.postcode,
          phone: withContact ? (a.phone ?? "") : "",
          email: withContact ? (a.email ?? "") : "",
        }
      : null;
  const billing = toInput(rows.find((r) => r.type === "billing"), true) ?? { ...blank, fullName: user.name ?? "" };
  if (!billing.email) billing.email = user.email;
  if (!billing.phone && userRow?.phone) billing.phone = userRow.phone;
  const shipping = toInput(rows.find((r) => r.type === "shipping"), false);
  return { billing, shipping };
}

/** Totals for the "Your order" box for a typed address (or the cart's saved destination). */
export async function computeReview(user: SessionUser | null, destination: { state: string; postcode: string } | null, email?: string | null): Promise<CheckoutReview> {
  const db = await getDb();
  const cart = await findCart(db, { create: false, user });
  const dest = destination && isCompleteDestination(destination) ? destination : null;
  const totals = await getCartTotals(db, cart, dest, email ?? null);
  const used = dest ?? (cart && (cart.shippingState || cart.shippingPostcode) ? { state: cart.shippingState ?? "", postcode: cart.shippingPostcode ?? "" } : null);
  return toReview(totals, used);
}

/* ------------------------------------------------------------------ */
/* Place order                                                         */
/* ------------------------------------------------------------------ */

async function findReusableOrder(db: Db, ref: string, method: PaymentMethodId): Promise<OrderRow | null> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const rows = await db
    .select({ id: schema.orders.id })
    .from(schema.orderEvents)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderEvents.orderId))
    .where(and(eq(schema.orderEvents.type, "checkout_ref"), eq(schema.orderEvents.message, ref), eq(schema.orders.status, "pending_payment"), gt(schema.orders.createdAt, since)))
    .orderBy(desc(schema.orders.id))
    .limit(1);
  if (!rows[0]) return null;
  const order = (await db.query.orders.findFirst({ where: eq(schema.orders.id, rows[0].id) })) ?? null;
  // A cash order never reuses an order that already has a Razorpay payment window (it could still be paid).
  if (order && method === "cod" && order.razorpayOrderId) return null;
  return order;
}

async function insertOrderWithUniqueNumber(db: Db, values: Omit<typeof schema.orders.$inferInsert, "number">, prefix: string): Promise<OrderRow> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const number = generateOrderNumber(prefix);
    const clash = await db.query.orders.findFirst({ where: eq(schema.orders.number, number), columns: { id: true } });
    if (clash) continue;
    try {
      const [row] = await db.insert(schema.orders).values({ ...values, number }).returning();
      return row;
    } catch (err) {
      // unique violation from a parallel request: try another number
      if (!/unique|duplicate/i.test(String(err))) throw err;
    }
  }
  throw new Error("Could not create a unique order number.");
}

/** Creates (or updates) the Razorpay order for a pending order and returns the popup parameters. */
export async function paymentParamsFor(db: Db, order: OrderRow): Promise<PaymentParams> {
  let rzpId = order.razorpayOrderId;
  if (!rzpId) {
    const rzp = await createRazorpayOrder({ amount: order.totalPaise, currency: "INR", receipt: order.number, notes: { orderNumber: order.number } });
    if (rzp.amount !== order.totalPaise) throw new RazorpayError("Razorpay returned a different amount.", 502);
    rzpId = rzp.id;
    await db.update(schema.orders).set({ razorpayOrderId: rzpId, updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
    await addEvent(db, order.id, "payment_started", `Razorpay order ${rzpId} created for ${(order.totalPaise / 100).toFixed(2)} INR.`);
  }
  return {
    orderNumber: order.number,
    razorpayOrderId: rzpId,
    keyId: publicKeyId(),
    amount: order.totalPaise,
    currency: "INR",
    prefill: { name: order.billing.fullName, email: order.email, contact: order.phone ?? "" },
  };
}

type PlaceOrderResult = { status: number; body: CheckoutApiResponse };

/**
 * Validates the form, recomputes the totals from the live cart and creates a pending order + Razorpay order.
 * Never trusts prices from the browser: `input.expected` is only used to detect that something changed.
 */
export async function placeOrder(input: CheckoutInput, ctx: { user: SessionUser | null; ip: string }): Promise<PlaceOrderResult> {
  const fieldErrors = validateCheckoutFields(input);
  if (Object.keys(fieldErrors).length) {
    return { status: 400, body: { ok: false, code: "validation", error: "Please check the highlighted fields.", fieldErrors } };
  }
  const billing = normalizeAddress(input.billing, { withContact: true }) as OrderAddress;
  const shipping = (input.shipToDifferent ? normalizeAddress(input.shipping) : { ...normalizeAddress(input.billing) }) as OrderAddress;
  const email = billing.email!;
  const dest = shippingDestination(input);
  const cod = input.paymentMethod === "cod";

  const db = await getDb();
  const cart = await findCart(db, { create: false, user: ctx.user });
  const totals = await getCartTotals(db, cart, dest, email);
  const review = toReview(totals, dest);
  if (!cart || !totals.lines.length) return { status: 409, body: { ok: false, code: "empty", error: "Your cart is empty. Please add products before placing an order.", review } };
  if (totals.removed.length || totals.couponError) {
    return { status: 409, body: { ok: false, code: "changed", error: review.notices.join(" ") || "Your cart changed. Please check your order and try again.", review } };
  }
  if (!totals.shippingAvailable || !totals.shipping) {
    const key = input.shipToDifferent ? "shipping.postcode" : "billing.postcode";
    return { status: 400, body: { ok: false, code: "shipping", error: noShippingMessage(dest.postcode), fieldErrors: { [key]: noShippingMessage(dest.postcode) }, review } };
  }
  if (!expectedMatches(input.expected, totals)) {
    return {
      status: 409,
      body: { ok: false, code: "changed", error: "Some prices, stock or shipping costs changed since the page was loaded. Please check the updated order total below and place your order again.", review },
    };
  }
  // WooCommerce's own message when the chosen method is not offered for this address
  if (cod && !totals.codAvailable) return { status: 400, body: { ok: false, code: "payment_method", error: "Invalid payment method.", review } };
  if (!cod && !isRazorpayConfigured()) return { status: 503, body: { ok: false, code: "not_configured", error: NOT_CONFIGURED_MESSAGE, review } };
  if (!cod && totals.totalPaise < 100) return { status: 400, body: { ok: false, error: "The order total is too low for online payment. Please contact info@jivo.in.", review } };

  const fingerprint = cartFingerprint(totals, email);
  const ref = formatCartRef(cart.id, fingerprint);
  const reusable = await findReusableOrder(db, ref, input.paymentMethod);

  // Which account does the order belong to? Only the logged-in user, or a NEW account created right now.
  // An existing account is never attached without login (anyone could type someone else's email).
  let userId: number | null = ctx.user?.id ?? null;
  let accountCreated = false;
  if (!ctx.user && input.createAccount) {
    const createdByReusable =
      reusable?.userId != null &&
      reusable.email === email &&
      !!(await db.query.orderEvents.findFirst({ where: and(eq(schema.orderEvents.orderId, reusable.id), eq(schema.orderEvents.type, "account_created")), columns: { id: true } }));
    if (createdByReusable) {
      userId = reusable!.userId;
    } else {
      const existing = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}`, columns: { id: true } });
      if (existing) {
        const msg = "An account is already registered with your email address. Please log in.";
        return { status: 400, body: { ok: false, code: "account_exists", error: msg, fieldErrors: { "billing.email": msg }, review } };
      }
      const acc = await ensureCustomerAccount(email, billing.fullName, billing.phone ?? null);
      if (acc.created) {
        userId = acc.userId;
        accountCreated = true;
      }
    }
  }

  const note = input.orderNotes.replace(/\r\n/g, "\n").trim().slice(0, 1000) || null;
  let order: OrderRow;
  if (reusable) {
    const [row] = await db
      .update(schema.orders)
      .set({ billing, shipping, email, phone: billing.phone ?? null, customerNote: note, userId, ipAddress: ctx.ip, paymentProvider: input.paymentMethod, updatedAt: new Date() })
      .where(and(eq(schema.orders.id, reusable.id), eq(schema.orders.status, "pending_payment")))
      .returning();
    if (!row) return { status: 409, body: { ok: false, code: "changed", error: "This order was already paid. Please check your email or your account.", review } };
    order = row;
    await addEvent(db, order.id, "checkout_retry", "Customer placed the order again (same cart and totals): pending order reused.", "customer");
  } else {
    const settings = await readSettings();
    order = await insertOrderWithUniqueNumber(
      db,
      {
        userId,
        email,
        phone: billing.phone ?? null,
        status: "pending_payment",
        currency: "INR",
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shipping.costPaise,
        totalPaise: totals.totalPaise,
        couponCode: totals.coupon?.code ?? null,
        shippingMethod: totals.shipping.label,
        billing,
        shipping,
        customerNote: note,
        paymentProvider: input.paymentMethod,
        accessToken: generateAccessToken(),
        ipAddress: ctx.ip,
      },
      settings.order_number_prefix || "JM",
    );
    const skus = await db
      .select({ id: schema.variations.id, sku: schema.variations.sku })
      .from(schema.variations)
      .where(inArray(schema.variations.id, totals.lines.map((l) => l.variationId)));
    await db.insert(schema.orderItems).values(
      totals.lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        variationId: l.variationId,
        productSlug: l.slug,
        productName: l.name,
        variationLabel: l.variationLabel,
        sku: skus.find((s) => s.id === l.variationId)?.sku ?? null,
        image: l.image,
        qty: l.qty,
        unitPricePaise: l.unitPricePaise,
        lineTotalPaise: l.lineTotalPaise,
      })),
    );
    await addEvent(db, order.id, "created", `Order created (pending payment). Total ${(order.totalPaise / 100).toFixed(2)} INR.`, ctx.user ? `user:${ctx.user.id}` : "guest");
    await addEvent(db, order.id, "checkout_ref", ref);
    if (input.reviewConsent) await addEvent(db, order.id, "review_consent", "Customer agreed to be invited to review the order.", "customer");
  }
  if (accountCreated) await addEvent(db, order.id, "account_created", "Customer account created at checkout; a set-password link was emailed.", "customer");

  if (cod) {
    await confirmCashOnDelivery(order.id, ctx.user ? `user:${ctx.user.id}` : "guest");
    return { status: 200, body: { ok: true, redirect: routes.orderReceived(order.number, order.accessToken) } };
  }

  try {
    const payment = await paymentParamsFor(db, order);
    return { status: 200, body: { ok: true, payment } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    await addEvent(db, order.id, "payment_error", `Could not start the Razorpay payment: ${msg}`);
    console.error("[checkout] Razorpay order failed:", msg);
    return { status: 502, body: { ok: false, code: "payment_provider", error: "We could not start the payment right now. Please try again in a minute.", review } };
  }
}

/* ------------------------------------------------------------------ */
/* Payment confirmation                                                */
/* ------------------------------------------------------------------ */

export type ConfirmResult = { ok: true; order: OrderRow } | { ok: false; status: number; error: string };

/**
 * Called after the browser popup succeeded and the signature was verified:
 * asks Razorpay for the payment, checks amount/currency/order, captures if needed, marks the order paid.
 */
export async function confirmPayment(order: OrderRow, paymentId: string, actor: string): Promise<ConfirmResult> {
  const db = await getDb();
  if (order.status !== "pending_payment") {
    if (order.razorpayPaymentId === paymentId) return { ok: true, order }; // already done (double click / webhook first)
    return { ok: false, status: 409, error: "This order is not waiting for payment any more." };
  }
  let payment;
  try {
    payment = await fetchPayment(paymentId);
  } catch (err) {
    return { ok: false, status: 502, error: `We could not confirm the payment with Razorpay (${err instanceof Error ? err.message : "error"}). If money was taken, your order will be confirmed automatically within a few minutes.` };
  }
  if (payment.order_id !== order.razorpayOrderId || payment.currency !== "INR" || payment.amount !== order.totalPaise) {
    await addEvent(db, order.id, "payment_mismatch", `Payment ${payment.id} does not match the order (order ${payment.order_id}, ${payment.amount} ${payment.currency}).`);
    return { ok: false, status: 400, error: "The payment does not match this order. Please contact info@jivo.in." };
  }
  if (payment.status === "authorized") {
    try {
      payment = await capturePayment(payment.id, order.totalPaise, "INR");
    } catch (err) {
      await addEvent(db, order.id, "payment_error", `Capture failed for ${paymentId}: ${err instanceof Error ? err.message : "error"}`);
      return { ok: false, status: 502, error: "Your payment was authorised but could not be captured. Please contact info@jivo.in – you will not be charged twice." };
    }
  }
  if (payment.status !== "captured") {
    await addEvent(db, order.id, "payment_failed", `Payment ${payment.id} status is "${payment.status}".`);
    return { ok: false, status: 402, error: "The payment was not completed. You can try again." };
  }
  await markOrderPaid(order.id, payment.id, actor);
  const fresh = await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) });
  return { ok: true, order: fresh ?? order };
}

function toEmailOrder(order: OrderRow, items: OrderItemRow[]): EmailOrder {
  const addr = (a: OrderAddress) => ({ fullName: a.fullName, address1: a.address1, address2: a.address2, city: a.city, state: stateName(a.state), postcode: a.postcode, phone: a.phone });
  return {
    number: order.number,
    createdAt: order.createdAt,
    email: order.email,
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    shippingPaise: order.shippingPaise,
    totalPaise: order.totalPaise,
    couponCode: order.couponCode,
    shippingMethod: order.shippingMethod,
    billing: addr(order.billing),
    shipping: addr(order.shipping),
    items: items.map((i) => ({ productName: i.productName, variationLabel: i.variationLabel, qty: i.qty, lineTotalPaise: i.lineTotalPaise })),
    customerNote: order.customerNote,
    cashOnDelivery: order.paymentProvider === "cod",
  };
}

async function saveCustomerAddress(db: Db, userId: number, type: "billing" | "shipping", a: OrderAddress) {
  const values = {
    fullName: a.fullName,
    company: a.company ?? null,
    address1: a.address1,
    address2: a.address2 ?? null,
    city: a.city,
    state: a.state,
    postcode: a.postcode,
    country: a.country || "IN",
    phone: type === "billing" ? (a.phone ?? null) : null,
    email: type === "billing" ? (a.email ?? null) : null,
    updatedAt: new Date(),
  };
  const existing = await db.query.addresses.findFirst({
    where: and(eq(schema.addresses.userId, userId), eq(schema.addresses.type, type)),
    orderBy: (t, { desc: d }) => [d(t.isDefault), d(t.updatedAt)],
  });
  if (existing) await db.update(schema.addresses).set(values).where(eq(schema.addresses.id, existing.id));
  else await db.insert(schema.addresses).values({ ...values, userId, type, isDefault: true });
}

/**
 * Marks an order as paid. IDEMPOTENT: the UPDATE only matches while the status is still
 * "pending_payment", so when the browser and the webhook arrive together only one call wins
 * and only that call reduces stock, records the coupon, clears the cart and sends emails.
 * Returns true when this call changed the order.
 */
export async function markOrderPaid(orderId: number, paymentId: string, actor = "system"): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const [order] = await db
    .update(schema.orders)
    .set({ status: "processing", paidAt: now, razorpayPaymentId: paymentId, updatedAt: now })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "pending_payment")))
    .returning();
  if (!order) return false;
  await addEvent(db, order.id, "paid", `Payment received via Razorpay (payment ${paymentId}). Status changed from Pending payment to Processing.`, actor);
  await completeOrder(db, order, now);
  return true;
}

/**
 * Cash on delivery: moves a new order straight to "processing" (nothing is paid yet; the courier
 * collects the money). IDEMPOTENT in the same way as markOrderPaid(). Returns true when it changed the order.
 */
export async function confirmCashOnDelivery(orderId: number, actor = "system"): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const [order] = await db
    .update(schema.orders)
    .set({ status: "processing", paymentProvider: "cod", updatedAt: now })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "pending_payment")))
    .returning();
  if (!order) return false;
  await addEvent(db, order.id, "cod", "Payment to be made upon delivery. Status changed from Pending payment to Processing.", actor);
  await completeOrder(db, order, now);
  return true;
}

/**
 * What happens once an order is confirmed (paid online or cash on delivery): stock, coupon usage,
 * empty the cart, remember the addresses, emails. Only the one call that flipped the status runs it.
 */
async function completeOrder(db: Db, order: OrderRow, now: Date): Promise<void> {
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      console.error(`[checkout] completeOrder ${order.number}: ${name} failed`, err);
      await addEvent(db, order.id, "error", `${name} failed: ${err instanceof Error ? err.message : String(err)}`).catch(() => undefined);
    }
  };

  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));

  // 1. stock
  let stockChanged = false;
  await step("Stock reduction", async () => {
    const notes: string[] = [];
    for (const it of items) {
      if (!it.variationId) continue;
      const rows = await db
        .update(schema.variations)
        .set({
          stockQty: sql`greatest(coalesce(${schema.variations.stockQty}, 0) - ${it.qty}, 0)`,
          inStock: sql`(coalesce(${schema.variations.stockQty}, 0) - ${it.qty}) > 0`,
          updatedAt: now,
        })
        .where(and(eq(schema.variations.id, it.variationId), eq(schema.variations.manageStock, true)))
        .returning({ stockQty: schema.variations.stockQty });
      if (rows[0]) {
        stockChanged = true;
        notes.push(`${it.productName}${it.variationLabel ? ` – ${it.variationLabel}` : ""}: now ${rows[0].stockQty}`);
      }
    }
    await db.update(schema.orders).set({ stockReduced: true }).where(eq(schema.orders.id, order.id));
    if (notes.length) await addEvent(db, order.id, "stock_reduced", `Stock levels reduced: ${notes.join("; ")}`);
  });

  // 2. coupon usage
  if (order.couponCode) {
    await step("Coupon usage", async () => {
      const coupon = await db.query.coupons.findFirst({ where: sql`upper(${schema.coupons.code}) = upper(${order.couponCode})` });
      if (!coupon) return;
      await db.insert(schema.couponUsages).values({ couponId: coupon.id, orderId: order.id, email: order.email });
      await db.update(schema.coupons).set({ usedCount: sql`${schema.coupons.usedCount} + 1`, updatedAt: now }).where(eq(schema.coupons.id, coupon.id));
    });
  }

  // 3. empty the cart the order came from
  await step("Clear cart", async () => {
    const refEvent = await db.query.orderEvents.findFirst({ where: and(eq(schema.orderEvents.orderId, order.id), eq(schema.orderEvents.type, "checkout_ref")) });
    const ref = parseCartRef(refEvent?.message);
    if (ref) {
      const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, ref.cartId), columns: { id: true } });
      if (cart) await clearCart(db, cart.id);
    }
  });

  // 4. remember the addresses for next time
  if (order.userId) {
    await step("Save addresses", async () => {
      await saveCustomerAddress(db, order.userId!, "billing", order.billing);
      await saveCustomerAddress(db, order.userId!, "shipping", order.shipping);
    });
  }

  // 5. emails
  await step("Emails", async () => {
    const data = toEmailOrder(order, items);
    const customer = orderConfirmationEmail(data, absoluteUrl(routes.orderReceived(order.number, order.accessToken)));
    const admin = adminNewOrderEmail(data, absoluteUrl(`${routes.admin}orders/${order.id}/`));
    const [a, b] = await Promise.all([sendMail({ to: order.email, subject: customer.subject, html: customer.html }), sendMail({ to: adminEmail(), subject: admin.subject, html: admin.html })]);
    if (a.ok) await db.update(schema.orders).set({ emailSent: true }).where(eq(schema.orders.id, order.id));
    await addEvent(db, order.id, "email", `Order confirmation email ${a.ok ? "sent" : `NOT sent (${a.error})`} to the customer; admin notification ${b.ok ? "sent" : `NOT sent (${b.error})`}.`);
  });

  if (stockChanged) {
    try {
      revalidateTag("catalog", "max");
    } catch {
      /* outside a request (scripts/tests) */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export async function findOrderByNumber(number: string): Promise<OrderRow | null> {
  const db = await getDb();
  return (await db.query.orders.findFirst({ where: eq(schema.orders.number, number) })) ?? null;
}

export async function findOrderByRazorpayOrderId(rzpOrderId: string): Promise<OrderRow | null> {
  const db = await getDb();
  return (await db.query.orders.findFirst({ where: eq(schema.orders.razorpayOrderId, rzpOrderId) })) ?? null;
}

/** Order + items for the thank-you page, only when the key matches or the logged-in owner asks. */
export async function getOrderForCustomer(number: string, key: string | null, user: SessionUser | null): Promise<(OrderRow & { items: OrderItemRow[] }) | null> {
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.number, number), with: { items: true } });
  if (!order) return null;
  const owner = user != null && order.userId != null && order.userId === user.id;
  if (!owner && !safeEqual(key ?? "", order.accessToken)) return null;
  return order;
}

export async function recordOrderEvent(orderId: number, type: string, message: string | null, actor = "system") {
  const db = await getDb();
  await addEvent(db, orderId, type, message, actor);
}

