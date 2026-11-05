/**
 * Read-only database queries for the admin pages (server only).
 * Admin pages always read live data (never the storefront catalog cache).
 */
import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { PAID_STATUSES, startOfTodayIST, type OrderStatus } from "./format";

export const PAGE_SIZE = 20;

export type Paged<T> = { rows: T[]; total: number; page: number; totalPages: number };

/** Page number from ?page= (1 when missing or invalid). */
export function pageParam(v: string | string[] | undefined): number {
  const n = Number(typeof v === "string" ? v : "1");
  return Number.isInteger(n) && n > 0 && n < 100_000 ? n : 1;
}

export function textParam(v: string | string[] | undefined, max = 100): string {
  return (typeof v === "string" ? v : "").trim().slice(0, max);
}

function paged<T>(rows: T[], total: number, page: number): Paged<T> {
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** LIKE pattern that treats % and _ typed by the admin as normal characters. */
function like(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const paidOnly = inArray(schema.orders.status, PAID_STATUSES);

/* ------------------------------------------------------------------ dashboard */

export type StockAlert = { productId: number; productName: string; variationId: number; label: string; sku: string | null; stockQty: number | null; manageStock: boolean; inStock: boolean };

export const LOW_STOCK_LIMIT = 5;

export async function getDashboard() {
  const db = await getDb();
  const today = startOfTodayIST();
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

  const [paidToday, pendingToday, revenue30, processing, pendingReviews, unreadMessages, waiting, recent, stock, zones] = await Promise.all([
    one(db.select({ n: count() }).from(schema.orders).where(and(gte(schema.orders.createdAt, today), paidOnly))),
    one(db.select({ n: count() }).from(schema.orders).where(and(gte(schema.orders.createdAt, today), eq(schema.orders.status, "pending_payment")))),
    one(
      db
        .select({ n: sql<number>`coalesce(sum(${schema.orders.totalPaise}), 0)::int` })
        .from(schema.orders)
        .where(and(paidOnly, gte(sql`coalesce(${schema.orders.paidAt}, ${schema.orders.createdAt})`, since30))),
    ),
    one(db.select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, "processing"))),
    one(db.select({ n: count() }).from(schema.reviews).where(eq(schema.reviews.status, "pending"))),
    one(db.select({ n: count() }).from(schema.contactMessages).where(eq(schema.contactMessages.status, "new"))),
    one(db.select({ n: count() }).from(schema.waitlist).where(isNull(schema.waitlist.notifiedAt))),
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt), desc(schema.orders.id)).limit(8),
    db
      .select({
        productId: schema.products.id,
        productName: schema.products.name,
        variationId: schema.variations.id,
        label: schema.variations.valueLabel,
        sku: schema.variations.sku,
        stockQty: schema.variations.stockQty,
        manageStock: schema.variations.manageStock,
        inStock: schema.variations.inStock,
      })
      .from(schema.variations)
      .innerJoin(schema.products, eq(schema.products.id, schema.variations.productId))
      .where(
        and(
          eq(schema.products.status, "publish"),
          or(
            eq(schema.variations.inStock, false),
            and(eq(schema.variations.manageStock, true), sql`coalesce(${schema.variations.stockQty}, 0) <= ${LOW_STOCK_LIMIT}`),
          ),
        ),
      )
      .orderBy(asc(schema.products.name), asc(schema.variations.sortOrder)),
    db.select().from(schema.shippingZones).orderBy(asc(schema.shippingZones.sortOrder)),
  ]);

  const secret = process.env.AUTH_SECRET || "";
  const warnings: { title: string; text: string; href?: string }[] = [];
  if (!process.env.SMTP_HOST) {
    warnings.push({
      title: "Email (SMTP) is not configured",
      text: "SMTP_HOST is not set, so order, password and back-in-stock emails are not sent (in development they are saved to .data/outbox). Set SMTP_HOST, SMTP_USER and SMTP_PASS on the server.",
    });
  }
  if (!isRazorpayConfigured()) {
    warnings.push({ title: "Razorpay keys are missing", text: "Customers cannot pay online. Set NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET on the server." });
  }
  if (secret.length < 32 || /change|secret|dev|test|example/i.test(secret)) {
    warnings.push({ title: "AUTH_SECRET is weak", text: "Login sessions are signed with AUTH_SECRET. Set it to a long random value (at least 32 characters, e.g. from `openssl rand -base64 48`)." });
  }
  const zoneNotes = zones.filter((z) => z.note && z.note.trim()).map((z) => ({ id: z.id, name: z.name, note: z.note as string, enabled: z.enabled }));

  return {
    paidToday,
    pendingToday,
    revenue30,
    processing,
    pendingReviews,
    unreadMessages,
    waiting,
    recent,
    stock: stock as StockAlert[],
    warnings,
    zoneNotes,
  };
}

/* ------------------------------------------------------------------ orders */

export type OrderListItem = typeof schema.orders.$inferSelect & { itemCount: number };

export async function listOrders(opts: { status: OrderStatus | "all"; q: string; page: number }): Promise<Paged<OrderListItem> & { counts: Record<string, number> }> {
  const db = await getDb();
  const where: SQL[] = [];
  if (opts.status !== "all") where.push(eq(schema.orders.status, opts.status));
  if (opts.q) {
    const p = like(opts.q.replace(/^#/, ""));
    where.push(
      or(
        ilike(schema.orders.number, p),
        ilike(schema.orders.email, p),
        ilike(schema.orders.phone, p),
        sql`(${schema.orders.billing}->>'fullName') ilike ${p}`,
        sql`(${schema.orders.shipping}->>'fullName') ilike ${p}`,
      ) as SQL,
    );
  }
  const cond = where.length ? and(...where) : undefined;
  const [totalRow, rows, statusCounts] = await Promise.all([
    db.select({ n: count() }).from(schema.orders).where(cond),
    db
      .select({
        order: schema.orders,
        itemCount: sql<number>`(select coalesce(sum(${schema.orderItems.qty}), 0)::int from ${schema.orderItems} where ${schema.orderItems.orderId} = ${schema.orders.id})`,
      })
      .from(schema.orders)
      .where(cond)
      .orderBy(desc(schema.orders.createdAt), desc(schema.orders.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ status: schema.orders.status, n: count() }).from(schema.orders).groupBy(schema.orders.status),
  ]);
  const counts: Record<string, number> = { all: 0 };
  for (const r of statusCounts) {
    counts[r.status] = r.n;
    counts.all += r.n;
  }
  return { ...paged(rows.map((r) => ({ ...r.order, itemCount: r.itemCount })), totalRow[0]?.n ?? 0, opts.page), counts };
}

/** Order by number ("JM12345678") or by database id ("42", used in the admin email link). */
export async function getAdminOrder(ref: string) {
  const db = await getDb();
  const clean = ref.trim().replace(/^#/, "");
  if (!/^[A-Za-z0-9-]{1,30}$/.test(clean)) return null;
  const withRel = { items: true, events: true, user: true } as const;
  let order = await db.query.orders.findFirst({ where: eq(schema.orders.number, clean), with: withRel });
  if (!order && /^\d{1,9}$/.test(clean)) order = await db.query.orders.findFirst({ where: eq(schema.orders.id, Number(clean)), with: withRel });
  if (!order) return null;
  order.items.sort((a, b) => a.id - b.id);
  // "checkout_ref" events are an internal cart link – not useful for people.
  order.events = order.events.filter((e) => e.type !== "checkout_ref").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  return order;
}
export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

/* ------------------------------------------------------------------ products */

export async function listProducts(opts: { q: string; page: number }) {
  const db = await getDb();
  const cond = opts.q ? or(ilike(schema.products.name, like(opts.q)), ilike(schema.products.slug, like(opts.q))) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ n: count() }).from(schema.products).where(cond),
    db.query.products.findMany({
      where: cond,
      with: { variations: true, images: true },
      orderBy: [asc(schema.products.sortOrder), asc(schema.products.name)],
      limit: PAGE_SIZE,
      offset: (opts.page - 1) * PAGE_SIZE,
    }),
  ]);
  const list = rows.map((p) => {
    const vars = p.variations;
    const sellable = (v: (typeof vars)[number]) => v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0);
    const prices = vars.map((v) => v.pricePaise);
    const image = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? vars.find((v) => v.image)?.image ?? null;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      template: p.template,
      status: p.status,
      visible: p.visible,
      featured: p.featured,
      image,
      packsInStock: vars.filter(sellable).length,
      packsTotal: vars.length,
      minPaise: prices.length ? Math.min(...prices) : null,
      maxPaise: prices.length ? Math.max(...prices) : null,
    };
  });
  return paged(list, totalRow[0]?.n ?? 0, opts.page);
}

export async function getAdminProduct(id: number) {
  const db = await getDb();
  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { variations: true, images: true, productCategories: { with: { category: true } } },
  });
  if (!product) return null;
  product.variations.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  product.images.sort((a, b) => a.sortOrder - b.sortOrder);
  const waiting = await db
    .select({ variationId: schema.waitlist.variationId, n: count() })
    .from(schema.waitlist)
    .where(and(eq(schema.waitlist.productId, id), isNull(schema.waitlist.notifiedAt)))
    .groupBy(schema.waitlist.variationId);
  return { product, waiting: waiting.map((w) => ({ variationId: w.variationId, count: w.n })) };
}

/* ------------------------------------------------------------------ coupons */

export async function listCoupons(opts: { q: string; page: number }) {
  const db = await getDb();
  const cond = opts.q ? or(ilike(schema.coupons.code, like(opts.q)), ilike(schema.coupons.description, like(opts.q))) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ n: count() }).from(schema.coupons).where(cond),
    db
      .select()
      .from(schema.coupons)
      .where(cond)
      .orderBy(desc(schema.coupons.createdAt), desc(schema.coupons.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
  ]);
  const now = Date.now();
  return paged(
    rows.map((c) => ({ ...c, expired: c.expiresAt != null && c.expiresAt.getTime() < now })),
    totalRow[0]?.n ?? 0,
    opts.page,
  );
}

export async function getCoupon(id: number) {
  const db = await getDb();
  return (await db.query.coupons.findFirst({ where: eq(schema.coupons.id, id) })) ?? null;
}

/* ------------------------------------------------------------------ shipping */

export async function listZones() {
  const db = await getDb();
  const zones = await db.query.shippingZones.findMany({ with: { rates: true }, orderBy: [asc(schema.shippingZones.sortOrder), asc(schema.shippingZones.id)] });
  for (const z of zones) z.rates.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return zones;
}

export async function getZone(id: number) {
  const db = await getDb();
  const zone = await db.query.shippingZones.findFirst({ where: eq(schema.shippingZones.id, id), with: { rates: true } });
  zone?.rates.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return zone ?? null;
}

/* ------------------------------------------------------------------ reviews */

export type ReviewTab = "pending" | "approved" | "spam";

export async function listReviews(opts: { status: ReviewTab; q: string; page: number }) {
  const db = await getDb();
  const where: SQL[] = [eq(schema.reviews.status, opts.status)];
  if (opts.q) {
    const p = like(opts.q);
    where.push(or(ilike(schema.reviews.authorName, p), ilike(schema.reviews.authorEmail, p), ilike(schema.reviews.body, p), ilike(schema.products.name, p)) as SQL);
  }
  const cond = and(...where);
  const [totalRow, rows, counts] = await Promise.all([
    db.select({ n: count() }).from(schema.reviews).innerJoin(schema.products, eq(schema.products.id, schema.reviews.productId)).where(cond),
    db
      .select({ review: schema.reviews, productName: schema.products.name, productSlug: schema.products.slug })
      .from(schema.reviews)
      .innerJoin(schema.products, eq(schema.products.id, schema.reviews.productId))
      .where(cond)
      .orderBy(desc(schema.reviews.createdAt), desc(schema.reviews.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ status: schema.reviews.status, n: count() }).from(schema.reviews).groupBy(schema.reviews.status),
  ]);
  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c.n;
  return { ...paged(rows, totalRow[0]?.n ?? 0, opts.page), counts: byStatus };
}

/* ------------------------------------------------------------------ waiting list */

export type WaitGroup = {
  key: string;
  productId: number;
  productName: string;
  productSlug: string;
  variationId: number | null;
  variationLabel: string | null;
  inStock: boolean;
  pending: number;
  entries: { id: number; email: string; createdAt: Date; notifiedAt: Date | null }[];
};

/** Waiting-list requests grouped by product + pack; groups with people still waiting come first. */
export async function listWaitlist(opts: { page: number; show: "waiting" | "all" }): Promise<Paged<WaitGroup>> {
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.waitlist.id,
      email: schema.waitlist.email,
      createdAt: schema.waitlist.createdAt,
      notifiedAt: schema.waitlist.notifiedAt,
      productId: schema.products.id,
      productName: schema.products.name,
      productSlug: schema.products.slug,
      variationId: schema.waitlist.variationId,
      variationLabel: schema.variations.valueLabel,
    })
    .from(schema.waitlist)
    .innerJoin(schema.products, eq(schema.products.id, schema.waitlist.productId))
    .leftJoin(schema.variations, eq(schema.variations.id, schema.waitlist.variationId))
    .where(opts.show === "waiting" ? isNull(schema.waitlist.notifiedAt) : undefined)
    .orderBy(asc(schema.products.name), desc(schema.waitlist.createdAt));

  const productIds = [...new Set(rows.map((r) => r.productId))];
  const vars = productIds.length ? await db.select().from(schema.variations).where(inArray(schema.variations.productId, productIds)) : [];
  const sellable = (v: (typeof vars)[number]) => v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0);

  const groups = new Map<string, WaitGroup>();
  for (const r of rows) {
    const key = `${r.productId}:${r.variationId ?? "any"}`;
    let g = groups.get(key);
    if (!g) {
      const inStock = r.variationId ? vars.some((v) => v.id === r.variationId && sellable(v)) : vars.some((v) => v.productId === r.productId && sellable(v));
      g = { key, productId: r.productId, productName: r.productName, productSlug: r.productSlug, variationId: r.variationId, variationLabel: r.variationLabel, inStock, pending: 0, entries: [] };
      groups.set(key, g);
    }
    g.entries.push({ id: r.id, email: r.email, createdAt: r.createdAt, notifiedAt: r.notifiedAt });
    if (!r.notifiedAt) g.pending++;
  }
  const all = [...groups.values()].sort((a, b) => Number(b.pending > 0) - Number(a.pending > 0) || a.productName.localeCompare(b.productName));
  const start = (opts.page - 1) * PAGE_SIZE;
  return paged(all.slice(start, start + PAGE_SIZE), all.length, opts.page);
}

/* ------------------------------------------------------------------ messages & subscribers */

export type MessageTab = "new" | "read" | "archived";

export async function listMessages(opts: { status: MessageTab; page: number }) {
  const db = await getDb();
  const cond = eq(schema.contactMessages.status, opts.status);
  const [totalRow, rows, counts] = await Promise.all([
    db.select({ n: count() }).from(schema.contactMessages).where(cond),
    db
      .select()
      .from(schema.contactMessages)
      .where(cond)
      .orderBy(desc(schema.contactMessages.createdAt), desc(schema.contactMessages.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ status: schema.contactMessages.status, n: count() }).from(schema.contactMessages).groupBy(schema.contactMessages.status),
  ]);
  const byStatus: Record<string, number> = {};
  for (const c of counts) byStatus[c.status] = c.n;
  return { ...paged(rows, totalRow[0]?.n ?? 0, opts.page), counts: byStatus };
}

export async function listSubscribers(opts: { q: string; page: number }) {
  const db = await getDb();
  const cond = opts.q ? ilike(schema.newsletterSubscribers.email, like(opts.q)) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ n: count() }).from(schema.newsletterSubscribers).where(cond),
    db
      .select()
      .from(schema.newsletterSubscribers)
      .where(cond)
      .orderBy(desc(schema.newsletterSubscribers.createdAt), desc(schema.newsletterSubscribers.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
  ]);
  return paged(rows, totalRow[0]?.n ?? 0, opts.page);
}

/* ------------------------------------------------------------------ customers */

const orderCountSql = sql<number>`count(${schema.orders.id}) filter (where ${paidOnly})::int`;
const spentSql = sql<number>`coalesce(sum(${schema.orders.totalPaise}) filter (where ${paidOnly}), 0)::int`;

export async function listCustomers(opts: { q: string; role: "all" | "admin" | "customer"; page: number }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (opts.role !== "all") where.push(eq(schema.users.role, opts.role));
  if (opts.q) where.push(or(ilike(schema.users.email, like(opts.q)), ilike(schema.users.name, like(opts.q)), ilike(schema.users.phone, like(opts.q))) as SQL);
  const cond = where.length ? and(...where) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ n: count() }).from(schema.users).where(cond),
    db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        phone: schema.users.phone,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
        orderCount: orderCountSql,
        spentPaise: spentSql,
      })
      .from(schema.users)
      .leftJoin(schema.orders, eq(schema.orders.userId, schema.users.id))
      .where(cond)
      .groupBy(schema.users.id)
      .orderBy(desc(schema.users.createdAt), desc(schema.users.id))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
  ]);
  return paged(rows, totalRow[0]?.n ?? 0, opts.page);
}

export async function getCustomer(id: number) {
  const db = await getDb();
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
    columns: { passwordHash: false },
    with: { addresses: true },
  });
  if (!user) return null;
  const [orders, totals] = await Promise.all([
    db.select().from(schema.orders).where(eq(schema.orders.userId, id)).orderBy(desc(schema.orders.createdAt)).limit(50),
    db.select({ orderCount: orderCountSql, spentPaise: spentSql }).from(schema.orders).where(eq(schema.orders.userId, id)),
  ]);
  return { user, orders, orderCount: totals[0]?.orderCount ?? 0, spentPaise: totals[0]?.spentPaise ?? 0 };
}
