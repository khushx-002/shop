/**
 * Imports data exported from the old WooCommerce shop (CSV files) into the new database.
 *
 *   npx tsx scripts/import-woocommerce.ts --customers wc-customers.csv --orders wc-orders.csv \
 *       --coupons wc-coupons.csv --reviews wc-reviews.csv [--dry-run] [--send-invites] [--resend-invites]
 *
 * Every flag is optional; import only what you have. Try it first with --dry-run: everything runs
 * inside one database transaction that is rolled back at the end, and the script prints what WOULD change.
 * Safe to run again: rows are matched by their old WooCommerce id (legacy_id), customers by email,
 * coupons by code, so a second run updates instead of duplicating.
 *
 * IMPORTANT (local PGlite database): PGlite allows ONE process at a time. Stop the dev server
 * before running this, or point PGLITE_DATA_DIR at a copy of .data/pglite. With DATABASE_URL
 * (real PostgreSQL) the dev server can keep running.
 *
 * Passwords: WordPress password hashes cannot be reused (different algorithm), so imported customers
 * have no password. --send-invites emails each of them a "set your password" link (valid 7 days).
 * Customers who already have a password, or an unused invite link, are skipped (use --resend-invites
 * to send again to people with an unused link). Emails go out only after a successful, non-dry run.
 *
 * ----------------------------------------------------------------------------------------------
 * Expected CSV headers (first row). WooCommerce core can only export PRODUCTS, so these headers follow
 * the free WebToffee export plugins most shops use ("Import Export WordPress Users and WooCommerce
 * Customers", "Order Export & Order Import for WooCommerce", "Product Reviews Import Export").
 * Header names are case-insensitive; the alternatives after "|" are accepted too.
 *
 * customers:  customer_id|ID, user_email|email, first_name, last_name, display_name, roles,
 *             billing_first_name, billing_last_name, billing_company, billing_email, billing_phone,
 *             billing_address_1, billing_address_2, billing_city, billing_state, billing_postcode, billing_country,
 *             shipping_first_name, shipping_last_name, shipping_company, shipping_address_1, shipping_address_2,
 *             shipping_city, shipping_state, shipping_postcode, shipping_country, user_registered
 * orders:     order_id, order_number, order_date, paid_date|date_paid, status, shipping_total, cart_discount|discount_total,
 *             order_total, payment_method, transaction_id, customer_user|customer_id, customer_note, shipping_method,
 *             billing_* and shipping_* (same as customers, plus billing_email/billing_phone),
 *             coupon_items ("code:JIVO200|amount:200.00"), shipping_items ("method_title:Flat rate|total:100.00"),
 *             line_item_1, line_item_2, ... each "name:Jivo Rice Bran Oil - 5 Litres|product_id:21211|variation_id:21212|sku:SJSORB-21211|quantity:1|total:949.00|sub_total:949.00"
 *             (a single "line_items" column with items separated by ";" also works)
 * coupons:    post_title|code, post_excerpt|description, post_status, discount_type, coupon_amount, free_shipping,
 *             minimum_amount, maximum_amount, date_expires|expiry_date, usage_limit, usage_count, usage_limit_per_user
 * reviews:    comment_ID, comment_post_ID|product_id, comment_author, comment_author_email, comment_date,
 *             comment_content, comment_approved, rating, verified, comment_type
 *
 * Status mapping (orders): wc-processing->processing, wc-completed->completed, wc-on-hold->pending_payment,
 * wc-cancelled->cancelled, wc-refunded->refunded, wc-failed->failed, wc-pending->pending_payment
 * (the "wc-" prefix is optional). Orders with any other status are skipped and listed.
 * Line items are matched to our pack sizes by old variation id, then by SKU (only when the SKU is unique),
 * then by name ("Product - Pack"). Unmatched lines are still imported with their name and price.
 * Dates without a time zone are read as Indian time (+05:30), like the old site.
 * ----------------------------------------------------------------------------------------------
 */
import "./lib/env";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { connect, type ScriptDb } from "./lib/connect";
import * as schema from "../src/lib/db/schema";
import { INDIAN_STATES, normalizeIndianPhone } from "../src/lib/india";
import { esc } from "../src/lib/email-templates";
import { SITE } from "../src/lib/site";
import { routes } from "../src/lib/routes";

/* ------------------------------------------------------------------ CLI */

type Options = { customers?: string; orders?: string; coupons?: string; reviews?: string; dryRun: boolean; sendInvites: boolean; resendInvites: boolean };

function parseArgs(argv: string[]): Options {
  const o: Options = { dryRun: false, sendInvites: false, resendInvites: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} needs a file path`);
      return v;
    };
    if (a === "--customers") o.customers = next();
    else if (a === "--orders") o.orders = next();
    else if (a === "--coupons") o.coupons = next();
    else if (a === "--reviews") o.reviews = next();
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--send-invites") o.sendInvites = true;
    else if (a === "--resend-invites") o.sendInvites = o.resendInvites = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: npx tsx scripts/import-woocommerce.ts [--customers f.csv] [--orders f.csv] [--coupons f.csv] [--reviews f.csv] [--dry-run] [--send-invites] [--resend-invites]");
      process.exit(0);
    } else throw new Error(`Unknown option: ${a}`);
  }
  if (!o.customers && !o.orders && !o.coupons && !o.reviews) throw new Error("Nothing to import. Pass at least one of --customers, --orders, --coupons, --reviews (see --help).");
  return o;
}

/* ------------------------------------------------------------------ CSV */

/**
 * Small RFC 4180 CSV parser: commas, double quotes ("" inside quotes = one quote), and
 * new lines inside quoted fields. Strips a UTF-8 BOM. Returns rows as arrays of strings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row); // skip empty lines
      row = [];
    } else field += c;
  }
  if (inQuotes) throw new Error("CSV ends inside a quoted field (missing closing quote).");
  if (field !== "" || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

type Rec = { get: (...names: string[]) => string; keys: string[]; line: number };

/** Reads a CSV file into records with case-insensitive header lookup. */
function readCsv(file: string): Rec[] {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const rows = parseCsv(fs.readFileSync(abs, "utf8"));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r, idx) => {
    const map = new Map<string, string>();
    header.forEach((h, i) => map.set(h, (r[i] ?? "").trim()));
    return {
      keys: header,
      line: idx + 2,
      get: (...names: string[]) => {
        for (const n of names) {
          const v = map.get(n.toLowerCase());
          if (v !== undefined && v !== "") return v;
        }
        return "";
      },
    };
  });
}

/* ------------------------------------------------------------------ value helpers */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanEmail(v: string): string | null {
  const e = v.trim().toLowerCase();
  return EMAIL_RE.test(e) && e.length <= 190 ? e : null;
}

/** "1,099.00" / "₹949" / "" -> paise (null for empty). */
function toPaise(v: string): number | null {
  const s = v.replace(/[^\d.-]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function toInt(v: string): number | null {
  const s = v.replace(/[^\d-]/g, "");
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** WooCommerce dates: "2025-03-14 10:22:31" (shop time = IST), ISO strings, or unix seconds. */
function toDate(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d{9,11}$/.test(s)) return new Date(Number(s) * 1000);
  const local = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/.exec(s);
  const d = local ? new Date(`${local[1]}T${local[2] ?? "00:00:00"}+05:30`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const yes = (v: string) => /^(1|yes|true|y)$/i.test(v.trim());

function stateCode(v: string): string {
  const s = v.trim();
  if (!s) return "";
  const up = s.toUpperCase();
  if (INDIAN_STATES.some((x) => x.code === up)) return up;
  const byName = INDIAN_STATES.find((x) => x.name.toLowerCase() === s.toLowerCase());
  return byName ? byName.code : up.slice(0, 8);
}

function clip(v: string, max: number): string {
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** billing_* / shipping_* columns -> address, or null when the street is empty. */
function addressFrom(r: Rec, prefix: "billing" | "shipping"): schema.OrderAddress | null {
  const g = (k: string) => r.get(`${prefix}_${k}`);
  const fullName = clip(`${g("first_name")} ${g("last_name")}`, 120) || clip(g("full_name") || g("name"), 120);
  const address1 = clip(g("address_1"), 200);
  if (!address1 && !g("city") && !g("postcode")) return null;
  const a: schema.OrderAddress = {
    fullName,
    address1,
    city: clip(g("city"), 100),
    state: stateCode(g("state")),
    postcode: g("postcode").replace(/\s+/g, "").slice(0, 12),
    country: (g("country") || "IN").toUpperCase().slice(0, 2),
  };
  const company = clip(g("company"), 120);
  const address2 = clip(g("address_2"), 200);
  if (company) a.company = company;
  if (address2) a.address2 = address2;
  if (prefix === "billing") {
    const phone = g("phone");
    const email = cleanEmail(g("email"));
    if (phone) a.phone = normalizeIndianPhone(phone) ?? clip(phone, 40);
    if (email) a.email = email;
  }
  return a;
}

/** "key:value|key:value" (WebToffee item format) -> object. Values may contain ":". */
function parseItem(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of s.split("|")) {
    const i = part.indexOf(":");
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();

/* ------------------------------------------------------------------ report */

type Counts = { created: number; updated: number; unchanged: number; skipped: number };
const report: Record<string, Counts> = {};
const notes: string[] = [];
function count(kind: string, what: keyof Counts, n = 1) {
  report[kind] ??= { created: 0, updated: 0, unchanged: 0, skipped: 0 };
  report[kind][what] += n;
}
function note(msg: string) {
  notes.push(msg);
}

type Tx = Pick<ScriptDb, "select" | "insert" | "update" | "delete" | "query">;

/* ------------------------------------------------------------------ customers */

async function importCustomers(db: Tx, file: string, invites: { userId: number; email: string; name: string | null }[]) {
  for (const r of readCsv(file)) {
    const email = cleanEmail(r.get("user_email", "email", "customer_email", "billing_email"));
    if (!email) {
      count("customers", "skipped");
      note(`customers row ${r.line}: skipped, no valid email`);
      continue;
    }
    const legacyId = toInt(r.get("customer_id", "id", "user_id"));
    const name = clip(`${r.get("first_name", "billing_first_name")} ${r.get("last_name", "billing_last_name")}`, 120) || clip(r.get("display_name"), 120) || null;
    const billing = addressFrom(r, "billing");
    const shipping = addressFrom(r, "shipping");
    const phone = billing?.phone ?? null;
    const createdAt = toDate(r.get("user_registered", "date_created")) ?? undefined;
    if (/administrator|shop_manager/i.test(r.get("roles", "role"))) note(`customers row ${r.line}: ${email} was staff on the old site; imported as a normal customer (give admin rights by hand if needed)`);

    const existing = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
    let userId: number;
    if (existing) {
      // Fill in missing details only; never overwrite what the customer changed on the new site.
      const patch: Partial<typeof schema.users.$inferInsert> = {};
      if (!existing.name && name) patch.name = name;
      if (!existing.phone && phone) patch.phone = phone;
      if (existing.legacyId == null && legacyId != null) patch.legacyId = legacyId;
      if (Object.keys(patch).length) {
        await db.update(schema.users).set({ ...patch, updatedAt: new Date() }).where(eq(schema.users.id, existing.id));
        count("customers", "updated");
      } else count("customers", "unchanged");
      userId = existing.id;
      if (!existing.passwordHash && existing.role === "customer") invites.push({ userId, email, name: existing.name ?? name });
    } else {
      const [row] = await db.insert(schema.users).values({ email, name, phone, role: "customer", legacyId, ...(createdAt ? { createdAt } : {}) }).returning({ id: schema.users.id });
      userId = row.id;
      count("customers", "created");
      invites.push({ userId, email, name });
    }

    for (const [type, a] of [["billing", billing], ["shipping", shipping]] as const) {
      if (!a || !a.address1) continue;
      const has = await db.query.addresses.findFirst({ where: and(eq(schema.addresses.userId, userId), eq(schema.addresses.type, type)), columns: { id: true } });
      if (has) continue; // keep the address the customer saved on the new site
      await db.insert(schema.addresses).values({
        userId,
        type,
        fullName: a.fullName || name || email,
        company: a.company ?? null,
        address1: a.address1,
        address2: a.address2 ?? null,
        city: a.city,
        state: a.state,
        postcode: a.postcode,
        country: a.country,
        phone: type === "billing" ? (a.phone ?? null) : null,
        email: type === "billing" ? (a.email ?? email) : null,
        isDefault: true,
      });
      count("addresses", "created");
    }
  }
}

/* ------------------------------------------------------------------ orders */

const STATUS: Record<string, (typeof schema.orderStatus.enumValues)[number]> = {
  processing: "processing",
  completed: "completed",
  "on-hold": "pending_payment",
  cancelled: "cancelled",
  refunded: "refunded",
  failed: "failed",
  pending: "pending_payment",
};

type CatalogVar = { id: number; legacyId: number | null; sku: string | null; valueSlug: string; valueLabel: string; productId: number; productName: string; productSlug: string; productLegacyId: number | null; image: string | null };

async function loadCatalog(db: Tx): Promise<CatalogVar[]> {
  const vars = await db.query.variations.findMany({ with: { product: { with: { images: true } } } });
  return vars.map((v) => ({
    id: v.id,
    legacyId: v.legacyId,
    sku: v.sku,
    valueSlug: v.valueSlug,
    valueLabel: v.valueLabel,
    productId: v.productId,
    productName: v.product.name,
    productSlug: v.product.slug,
    productLegacyId: v.product.legacyId,
    image: v.image ?? [...v.product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null,
  }));
}

/** Finds our pack size for an order line: old variation id, unique SKU, then "Product - Pack" name. */
function matchLine(catalog: CatalogVar[], item: Record<string, string>): { v: CatalogVar; by: string } | null {
  const variationId = toInt(item.variation_id ?? "");
  if (variationId) {
    const v = catalog.find((c) => c.legacyId === variationId);
    if (v) return { v, by: "variation id" };
  }
  const sku = (item.sku ?? "").trim();
  if (sku) {
    const hits = catalog.filter((c) => c.sku && c.sku.toLowerCase() === sku.toLowerCase());
    if (hits.length === 1) return { v: hits[0], by: "sku" };
  }
  const name = norm(item.name ?? "");
  if (name) {
    // longest product name that the line name starts with
    const products = [...new Map(catalog.map((c) => [c.productId, c])).values()].filter((c) => name.startsWith(norm(c.productName))).sort((a, b) => b.productName.length - a.productName.length);
    const product = products[0];
    if (product) {
      const rest = name.slice(norm(product.productName).length).trim();
      const packs = catalog.filter((c) => c.productId === product.productId);
      const meta = norm(item.meta ?? "");
      const v = packs.find((p) => rest && norm(p.valueLabel) === rest) ?? packs.find((p) => meta.includes(norm(p.valueSlug))) ?? (packs.length === 1 ? packs[0] : undefined);
      if (v) return { v, by: "name" };
    }
  }
  return null;
}

async function importOrders(db: Tx, file: string) {
  const catalog = await loadCatalog(db);
  for (const r of readCsv(file)) {
    const legacyId = toInt(r.get("order_id", "id"));
    const number = clip(r.get("order_number") || (legacyId != null ? String(legacyId) : ""), 24);
    const rawStatus = r.get("status", "order_status").toLowerCase().replace(/^wc-/, "");
    const status = STATUS[rawStatus];
    const billing = addressFrom(r, "billing");
    const email = cleanEmail(r.get("billing_email", "customer_email", "email"));
    if (!number || !status || !email || !billing) {
      count("orders", "skipped");
      note(`orders row ${r.line}: skipped (${!number ? "no order number" : !status ? `unknown status "${rawStatus}"` : !email ? "no valid billing email" : "no billing address"})`);
      continue;
    }
    const shipping = addressFrom(r, "shipping") ?? { ...billing, phone: undefined, email: undefined };
    delete shipping.phone;
    delete shipping.email;

    // line items
    const itemTexts = r.keys.filter((k) => /^line_item_\d+$/.test(k)).sort((a, b) => Number(a.slice(10)) - Number(b.slice(10))).map((k) => r.get(k)).filter(Boolean);
    if (!itemTexts.length && r.get("line_items")) itemTexts.push(...r.get("line_items").split(";").filter((s) => s.trim()));
    const lines = itemTexts.map((t) => {
      const it = parseItem(t);
      const qty = Math.max(1, toInt(it.quantity ?? it.qty ?? "1") ?? 1);
      const lineTotal = toPaise(it.total ?? "") ?? toPaise(it.sub_total ?? it.subtotal ?? "") ?? 0;
      const m = matchLine(catalog, it);
      if (!m) note(`orders ${number}: line "${it.name ?? t.slice(0, 60)}" not matched to a product (kept with its name and price)`);
      return {
        productId: m?.v.productId ?? null,
        variationId: m?.v.id ?? null,
        productSlug: m?.v.productSlug ?? null,
        productName: clip(m?.v.productName ?? (it.name || "Product"), 200),
        variationLabel: m?.v.valueLabel ?? null,
        sku: clip(it.sku || m?.v.sku || "", 80) || null,
        image: m?.v.image ?? null,
        qty,
        unitPricePaise: Math.round(lineTotal / qty),
        lineTotalPaise: lineTotal,
      };
    });

    const shippingPaise = toPaise(r.get("shipping_total", "order_shipping")) ?? 0;
    const discountPaise = toPaise(r.get("discount_total", "cart_discount", "order_discount")) ?? 0;
    const itemsTotal = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
    const totalPaise = toPaise(r.get("order_total", "total")) ?? itemsTotal - discountPaise + shippingPaise;
    // WooCommerce line "total" is after discounts; the subtotal shown to customers is before them.
    const subtotalPaise = lines.length ? Math.max(itemsTotal, totalPaise - shippingPaise + discountPaise) : Math.max(0, totalPaise - shippingPaise + discountPaise);
    const coupon = parseItem(r.get("coupon_items").split(";")[0] ?? "").code || null;
    const shipItem = parseItem(r.get("shipping_items").split(";")[0] ?? "");
    const shippingMethod = clip(r.get("shipping_method", "shipping_method_title") || shipItem.method_title || shipItem.method || "", 80) || null;
    const createdAt = toDate(r.get("order_date", "date_created")) ?? new Date();
    const paid = status === "processing" || status === "completed" || status === "refunded";
    const paidAt = paid ? (toDate(r.get("paid_date", "date_paid", "date_completed")) ?? createdAt) : null;
    const paymentMethod = clip(r.get("payment_method") || "razorpay", 30);
    const transactionId = clip(r.get("transaction_id"), 64) || null;

    // Link to a customer only through the old WooCommerce customer id (never just by email).
    const customerLegacy = toInt(r.get("customer_user", "customer_id"));
    const user = customerLegacy ? await db.query.users.findFirst({ where: eq(schema.users.legacyId, customerLegacy), columns: { id: true } }) : undefined;

    const values = {
      number,
      legacyId,
      userId: user?.id ?? null,
      email,
      phone: billing.phone ?? null,
      status,
      currency: (r.get("order_currency", "currency") || "INR").toUpperCase().slice(0, 3),
      subtotalPaise,
      discountPaise,
      shippingPaise,
      totalPaise,
      couponCode: coupon ? clip(coupon.toUpperCase(), 40) : null,
      shippingMethod,
      billing,
      shipping,
      customerNote: r.get("customer_note").slice(0, 2000) || null,
      paymentProvider: paymentMethod,
      razorpayPaymentId: /razorpay/i.test(paymentMethod) ? transactionId : null,
      paidAt,
      createdAt,
      updatedAt: new Date(),
      stockReduced: true, // historic order: never touch today's stock
      emailSent: true, // and never email the customer about it again
    };

    const existing = await db.query.orders.findFirst({
      where: legacyId != null ? sql`${schema.orders.legacyId} = ${legacyId} or ${schema.orders.number} = ${number}` : eq(schema.orders.number, number),
    });
    if (existing) {
      if (existing.legacyId == null) {
        count("orders", "skipped");
        note(`orders ${number}: an order with this number was created on the NEW site; old order not imported`);
        continue;
      }
      const changed = existing.status !== status || existing.totalPaise !== totalPaise || existing.email !== email;
      await db.update(schema.orders).set(values).where(eq(schema.orders.id, existing.id));
      await db.delete(schema.orderItems).where(eq(schema.orderItems.orderId, existing.id));
      if (lines.length) await db.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId: existing.id })));
      count("orders", changed ? "updated" : "unchanged");
      count("order lines", changed ? "updated" : "unchanged", lines.length);
    } else {
      const [row] = await db
        .insert(schema.orders)
        .values({ ...values, accessToken: randomBytes(24).toString("base64url") })
        .returning({ id: schema.orders.id });
      if (lines.length) await db.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId: row.id })));
      await db.insert(schema.orderEvents).values({ orderId: row.id, type: "imported", message: `Imported from the old WooCommerce shop (order #${number}, status "${rawStatus}").`, actor: "import", createdAt });
      count("orders", "created");
      count("order lines", "created", lines.length);
    }
  }
}

/* ------------------------------------------------------------------ coupons */

async function importCoupons(db: Tx, file: string) {
  for (const r of readCsv(file)) {
    const code = clip(r.get("post_title", "code", "coupon_code"), 40).toUpperCase();
    if (!code) {
      count("coupons", "skipped");
      note(`coupons row ${r.line}: skipped, no code`);
      continue;
    }
    const wcType = r.get("discount_type", "type").toLowerCase() || "fixed_cart";
    const rawAmount = r.get("coupon_amount", "amount");
    const freeShipping = yes(r.get("free_shipping"));
    let type: "fixed_cart" | "percent" | "free_shipping";
    let amount: number;
    if (wcType === "percent" || wcType === "percent_product") {
      type = "percent";
      amount = Math.min(100, Math.max(0, Math.round(Number(rawAmount.replace(/[^\d.]/g, "")) || 0)));
    } else {
      type = "fixed_cart";
      amount = Math.max(0, toPaise(rawAmount) ?? 0);
      if (wcType === "fixed_product") note(`coupons ${code}: "fixed_product" is imported as a whole-cart discount; check it in the admin`);
    }
    if (freeShipping && amount === 0) type = "free_shipping";
    else if (freeShipping) note(`coupons ${code}: gives a discount AND free shipping on the old site; the new shop supports one of them per coupon (discount kept)`);
    const status = r.get("post_status", "status").toLowerCase();
    const values = {
      code,
      type,
      amount,
      description: clip(r.get("post_excerpt", "description"), 200) || null,
      minSpendPaise: toPaise(r.get("minimum_amount", "minimum_spend")),
      maxSpendPaise: toPaise(r.get("maximum_amount", "maximum_spend")),
      expiresAt: toDate(r.get("date_expires", "expiry_date")),
      usageLimit: toInt(r.get("usage_limit")) || null,
      perUserLimit: toInt(r.get("usage_limit_per_user")) || null,
      active: status === "" || status === "publish",
      updatedAt: new Date(),
    };
    const usedCount = toInt(r.get("usage_count")) ?? 0;
    const existing = await db.query.coupons.findFirst({ where: sql`upper(${schema.coupons.code}) = ${code}` });
    if (existing) {
      // keep the higher usage count (uses on the new site + old site history)
      await db.update(schema.coupons).set({ ...values, code: existing.code, usedCount: Math.max(existing.usedCount, usedCount) }).where(eq(schema.coupons.id, existing.id));
      count("coupons", "updated");
    } else {
      await db.insert(schema.coupons).values({ ...values, usedCount });
      count("coupons", "created");
    }
  }
}

/* ------------------------------------------------------------------ reviews */

async function importReviews(db: Tx, file: string) {
  const products = await db.select({ id: schema.products.id, legacyId: schema.products.legacyId, name: schema.products.name }).from(schema.products);
  const touched = new Set<string>();
  for (const r of readCsv(file)) {
    const type = r.get("comment_type").toLowerCase();
    if (type && type !== "review" && type !== "comment") {
      count("reviews", "skipped");
      continue; // order notes, webhooks, pingbacks...
    }
    const legacyId = toInt(r.get("comment_id", "id"));
    const productLegacy = toInt(r.get("comment_post_id", "product_id"));
    const product = products.find((p) => p.legacyId === productLegacy);
    const approved = r.get("comment_approved", "status").toLowerCase();
    const body = r.get("comment_content", "review", "content").replace(/\r\n/g, "\n").trim().slice(0, 5000);
    const rating = Math.min(5, Math.max(1, toInt(r.get("rating")) ?? 5));
    if (!product || !body || approved === "trash" || approved === "post-trashed") {
      count("reviews", "skipped");
      note(`reviews row ${r.line}: skipped (${!product ? `no product with old id ${productLegacy}` : !body ? "empty text" : "in trash"})`);
      continue;
    }
    const status: "approved" | "pending" | "spam" = approved === "1" || approved === "approved" ? "approved" : approved === "spam" ? "spam" : "pending";
    const values = {
      legacyId,
      productId: product.id,
      authorName: clip(r.get("comment_author", "author", "reviewer") || "Customer", 120),
      authorEmail: cleanEmail(r.get("comment_author_email", "email", "reviewer_email")),
      rating,
      body,
      verified: yes(r.get("verified")),
      status,
      createdAt: toDate(r.get("comment_date", "date", "date_created")) ?? new Date(),
    };
    const existing =
      (legacyId != null ? await db.query.reviews.findFirst({ where: eq(schema.reviews.legacyId, legacyId) }) : undefined) ??
      // reviews seeded from the public pages have no legacy id: match them by product + author + text
      (await db.query.reviews.findFirst({ where: and(eq(schema.reviews.productId, product.id), eq(schema.reviews.authorName, values.authorName), eq(schema.reviews.body, body)) }));
    if (existing) {
      await db.update(schema.reviews).set(values).where(eq(schema.reviews.id, existing.id));
      count("reviews", existing.legacyId == null ? "updated" : "unchanged");
    } else {
      await db.insert(schema.reviews).values(values);
      count("reviews", "created");
    }
    touched.add(product.name);
  }
  if (touched.size) note(`reviews: the star rating shown on product cards (products.rating_avg / rating_count) was NOT recalculated; it still shows the old site's numbers. Check: ${[...touched].join(", ")}`);
}

/* ------------------------------------------------------------------ invites */

function inviteEmail(name: string | null, link: string) {
  const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${html}</p>`;
  return {
    subject: "Your Jivo Mart account has moved – please set a new password",
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Set your password</title></head><body style="margin:0;padding:24px 0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333;">
<table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:6px;">
<tr><td style="background:#0f4526;padding:20px 24px;color:#fff;font-size:20px;font-weight:bold;text-align:center;">Jivo Mart</td></tr>
<tr><td style="padding:28px 24px 8px;">${p(`Hi ${esc(name || "there")},`)}${p("We have moved Jivo Mart to a new, faster website. Your account, addresses and order history came with you, but for your security your old password could not be moved.")}${p("Please click the button below to choose a new password. The link works for 7 days.")}
<p style="margin:24px 0;"><a href="${esc(link)}" style="background:#0f4526;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;display:inline-block;">Set my password</a></p>
${p(`If the link has expired, use "Lost your password?" on ${esc(SITE.url.replace(/^https?:\/\//, ""))}/my-account/. Questions? Write to ${esc(SITE.email)}.`)}</td></tr></table></body></html>`,
  };
}

async function sendInvites(db: ScriptDb, list: { userId: number; email: string; name: string | null }[], resend: boolean) {
  // dynamic imports: these modules use the "@/..." alias, only needed when emails are really sent
  const { createToken } = await import("../src/lib/auth/tokens");
  const { sendMail } = await import("../src/lib/email");
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const u of list) {
    const fresh = await db.query.users.findFirst({ where: eq(schema.users.id, u.userId) });
    if (!fresh || fresh.passwordHash) {
      skipped++;
      continue;
    }
    const pending = await db.query.passwordResetTokens.findFirst({
      where: and(eq(schema.passwordResetTokens.userId, u.userId), eq(schema.passwordResetTokens.purpose, "set_password"), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())),
    });
    if (pending && !resend) {
      skipped++;
      continue;
    }
    const token = await createToken(db, u.userId, "set_password");
    const link = SITE.url.replace(/\/$/, "") + routes.resetPassword(token);
    const mail = inviteEmail(fresh.name ?? u.name, link);
    const res = await sendMail({ to: u.email, subject: mail.subject, html: mail.html });
    if (res.ok) sent++;
    else {
      failed++;
      console.error(`  invite to ${u.email} failed: ${res.error}`);
    }
    await new Promise((r) => setTimeout(r, 250)); // be gentle with the SMTP server
  }
  console.log(`Invites: ${sent} sent, ${skipped} skipped (already have a password or an unused link), ${failed} failed.`);
}

/* ------------------------------------------------------------------ main */

/** Refuses to open the local PGlite folder while a Next.js server is answering (two processes corrupt it). */
async function guardPglite() {
  if (process.env.DATABASE_URL) return;
  const dir = process.env.PGLITE_DATA_DIR || "./.data/pglite";
  console.warn(`! Using the local PGlite database at ${dir}. PGlite allows ONE process: stop the dev server first (or use a copy of the folder).`);
  if (dir === "memory" || path.resolve(dir) !== path.resolve("./.data/pglite")) return;
  for (const port of [3000, 3100]) {
    try {
      await fetch(`http://localhost:${port}/robots.txt`, { signal: AbortSignal.timeout(1500) });
      throw new Error(`A server is running on http://localhost:${port}. Stop it before importing into ./.data/pglite (or set PGLITE_DATA_DIR to a copy).`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("A server is running")) throw err;
    }
  }
}

class DryRunRollback extends Error {}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await guardPglite();
  const { db, close, kind } = await connect();
  console.log(`Importing into ${kind} database${opts.dryRun ? " (DRY RUN – nothing will be saved)" : ""}...`);
  const invites: { userId: number; email: string; name: string | null }[] = [];
  try {
    await db.transaction(async (tx) => {
      if (opts.customers) await importCustomers(tx, opts.customers, invites);
      if (opts.coupons) await importCoupons(tx, opts.coupons);
      if (opts.orders) await importOrders(tx, opts.orders);
      if (opts.reviews) await importReviews(tx, opts.reviews);
      if (opts.dryRun) throw new DryRunRollback();
    });
  } catch (err) {
    if (!(err instanceof DryRunRollback)) {
      await close();
      throw err;
    }
  }

  console.log("");
  console.log(opts.dryRun ? "What WOULD change:" : "Result:");
  console.table(report);
  if (notes.length) {
    console.log("Notes:");
    for (const n of notes) console.log(`  - ${n}`);
  }
  if (opts.sendInvites) {
    if (opts.dryRun) console.log(`Invites: would email up to ${invites.length} customer(s) without a password (dry run: nothing sent).`);
    else await sendInvites(db, invites, opts.resendInvites);
  } else if (invites.length) {
    console.log(`${invites.length} imported customer(s) have no password yet. Run again with --send-invites to email them a set-password link.`);
  }
  await close();
}

// Run only when started as a script (tests import parseCsv without running the import).
if (/import-woocommerce\.[cm]?[tj]s$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
