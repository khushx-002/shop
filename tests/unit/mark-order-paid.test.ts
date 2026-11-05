/**
 * Integration test: markOrderPaid() is idempotent (browser confirmation + webhook can arrive together).
 * In-memory database; emails are mocked so nothing is written to .data/outbox.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { makeCart, setupTestDb, type FixtureIds } from "../helpers/fixtures";
import { schema, type Db } from "@/lib/db";

const sendMail = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock("@/lib/email", () => ({ sendMail, adminEmail: () => "admin@example.com" }));

const HAS_ORDERS = existsSync(path.join(process.cwd(), "src/lib/checkout/orders.ts"));

let db: Db;
let ids: FixtureIds;

beforeAll(async () => {
  ({ db, ids } = await setupTestDb());
});

async function pendingOrder(opts: { coupon?: string; userId?: number | null; qty?: number } = {}) {
  const qty = opts.qty ?? 2;
  const cart = await makeCart(db, [[ids.variations.sano1l, qty]], { coupon: opts.coupon });
  const address = { fullName: "Test Buyer", address1: "Street 1", city: "Delhi", state: "DL", postcode: "110064", country: "IN", phone: "9876543210", email: "buyer@example.com" };
  const number = `JMT${Math.floor(Math.random() * 1e8)}`;
  const [order] = await db
    .insert(schema.orders)
    .values({
      number,
      email: "buyer@example.com",
      userId: opts.userId ?? null,
      subtotalPaise: 29500 * qty,
      totalPaise: 29500 * qty,
      couponCode: opts.coupon ?? null,
      billing: address,
      shipping: address,
      accessToken: "x".repeat(32),
      razorpayOrderId: `order_${number}`,
    })
    .returning();
  await db.insert(schema.orderItems).values({ orderId: order.id, variationId: ids.variations.sano1l, productId: ids.products.sano, productName: "Sano Pomace Olive Oil", variationLabel: "1 Litre", qty, unitPricePaise: 29500, lineTotalPaise: 29500 * qty });
  await db.insert(schema.orderEvents).values({ orderId: order.id, type: "checkout_ref", message: `cart:${cart.id};fp:abcdef0123456789` });
  return { order, cart };
}

describe.skipIf(!HAS_ORDERS)("markOrderPaid", async () => {
  const { markOrderPaid } = await import("@/lib/checkout/orders");

  it("only the first of two parallel calls does the work", async () => {
    await db.update(schema.variations).set({ manageStock: true, stockQty: 5, inStock: true }).where(eq(schema.variations.id, ids.variations.sano1l));
    const [user] = await db.insert(schema.users).values({ email: "buyer@example.com", name: "Test Buyer" }).returning();
    const { order, cart } = await pendingOrder({ coupon: "PCT10", userId: user.id });
    sendMail.mockClear();

    const results = await Promise.all([markOrderPaid(order.id, "pay_A", "browser"), markOrderPaid(order.id, "pay_A", "webhook")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await markOrderPaid(order.id, "pay_A", "webhook")).toBe(false); // a late third call changes nothing

    const fresh = (await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) }))!;
    expect(fresh.status).toBe("processing");
    expect(fresh.razorpayPaymentId).toBe("pay_A");
    expect(fresh.paidAt).not.toBeNull();
    expect(fresh.stockReduced).toBe(true);
    expect(fresh.emailSent).toBe(true);

    // stock reduced once: 5 - 2 = 3
    const v = (await db.query.variations.findFirst({ where: eq(schema.variations.id, ids.variations.sano1l) }))!;
    expect(v.stockQty).toBe(3);
    expect(v.inStock).toBe(true);

    // coupon counted once
    const coupon = (await db.query.coupons.findFirst({ where: eq(schema.coupons.code, "PCT10") }))!;
    expect(coupon.usedCount).toBe(1);
    const usages = await db.select().from(schema.couponUsages).where(eq(schema.couponUsages.orderId, order.id));
    expect(usages).toHaveLength(1);
    expect(usages[0].email).toBe("buyer@example.com");

    // one "paid" event, cart emptied, customer + admin email sent once each
    const paidEvents = await db.select().from(schema.orderEvents).where(and(eq(schema.orderEvents.orderId, order.id), eq(schema.orderEvents.type, "paid")));
    expect(paidEvents).toHaveLength(1);
    expect(await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id))).toHaveLength(0);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls.map((c) => (c as unknown as [{ to: string }])[0].to).sort()).toEqual(["admin@example.com", "buyer@example.com"]);

    // addresses remembered for the logged-in customer
    const saved = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id));
    expect(saved.map((a) => a.type).sort()).toEqual(["billing", "shipping"]);
  });

  it("marks the pack out of stock when the last units are sold", async () => {
    await db.update(schema.variations).set({ manageStock: true, stockQty: 2, inStock: true }).where(eq(schema.variations.id, ids.variations.sano1l));
    const { order } = await pendingOrder({ qty: 2 });
    expect(await markOrderPaid(order.id, "pay_B")).toBe(true);
    const v = (await db.query.variations.findFirst({ where: eq(schema.variations.id, ids.variations.sano1l) }))!;
    expect(v.stockQty).toBe(0);
    expect(v.inStock).toBe(false);
  });

  it("does nothing for orders that are not pending payment", async () => {
    const { order } = await pendingOrder();
    await db.update(schema.orders).set({ status: "cancelled" }).where(eq(schema.orders.id, order.id));
    sendMail.mockClear();
    expect(await markOrderPaid(order.id, "pay_C")).toBe(false);
    const fresh = (await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) }))!;
    expect(fresh.status).toBe("cancelled");
    expect(fresh.razorpayPaymentId).toBeNull();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
