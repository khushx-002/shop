/**
 * Cash on delivery (like the old shop.jivo.in): offered only in zones that allow it, the
 * "Sorry! COD ..." notice in zones that show one, and placeOrder() with COD skips Razorpay and
 * confirms the order at once. In-memory database; emails are mocked; findCart() is mocked because
 * the real one reads the cart cookie of a request.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { makeCart, setupTestDb, type FixtureIds } from "../helpers/fixtures";
import { schema, type Db } from "@/lib/db";
import type { CheckoutInput } from "@/lib/checkout/types";

const sendMail = vi.hoisted(() => vi.fn<(mail: { to: string; subject: string; html: string }) => Promise<{ ok: boolean }>>(async () => ({ ok: true })));
vi.mock("@/lib/email", () => ({ sendMail, adminEmail: () => "admin@example.com" }));
const currentCart = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/lib/cart", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/cart")>()), findCart: vi.fn(async () => currentCart.value) }));

const NOTICE = "Sorry! COD (Cash On Delivery) is not available at the moment.";
let db: Db;
let ids: FixtureIds;

beforeAll(async () => {
  ({ db, ids } = await setupTestDb());
  // fixture zones: Delhi NCR (110/122/201, free >= ₹999 else ₹100), Maharashtra (flat ₹50), Rest of India
  await db.update(schema.shippingZones).set({ codEnabled: true }).where(eq(schema.shippingZones.id, ids.zones.ncr));
  const [pb] = await db.insert(schema.shippingZones).values({ name: "Punjab", states: ["PB"], sortOrder: 4, codUnavailableNotice: NOTICE }).returning();
  await db.insert(schema.shippingRates).values({ zoneId: pb.id, type: "free", label: "Free shipping", minOrderPaise: 50000, sortOrder: 1 });
});

describe("cash on delivery in the cart totals", async () => {
  const { getCartTotals } = await import("@/lib/cart");

  it("is offered in a zone that allows it, without a notice", async () => {
    const cart = await makeCart(db, [[ids.variations.sano1l, 1]]);
    const t = await getCartTotals(db, cart, { state: "DL", postcode: "110064" });
    expect(t).toMatchObject({ codAvailable: true, codNotice: null });
  });

  it("Punjab: no COD and the notice, also when there is no shipping method for a small order", async () => {
    const small = await makeCart(db, [[ids.variations.sano1l, 1]]); // ₹295 < ₹500: no shipping in Punjab
    const t = await getCartTotals(db, small, { state: "PB", postcode: "151301" });
    expect(t).toMatchObject({ shippingAvailable: false, codAvailable: false, codNotice: NOTICE });
    const big = await makeCart(db, [[ids.variations.sano1l, 2]]);
    expect(await getCartTotals(db, big, { state: "PB", postcode: "151301" })).toMatchObject({ shippingAvailable: true, codAvailable: false, codNotice: NOTICE });
  });

  it("other zones: no COD and no notice; no address: neither", async () => {
    const cart = await makeCart(db, [[ids.variations.sano1l, 1]]);
    expect(await getCartTotals(db, cart, { state: "MH", postcode: "400001" })).toMatchObject({ codAvailable: false, codNotice: null });
    expect(await getCartTotals(db, cart, null)).toMatchObject({ codAvailable: false, codNotice: null });
  });
});

describe("placeOrder with cash on delivery", async () => {
  const { placeOrder } = await import("@/lib/checkout/orders");
  const address = (state: string, postcode: string) => ({ fullName: "Test Buyer", company: "", address1: "Street 1", address2: "", city: "Test City", state, postcode, phone: "9876543210", email: "cod@example.com" });
  const input = (state: string, postcode: string, totalPaise: number, qty = 2): CheckoutInput => ({
    billing: address(state, postcode),
    shipToDifferent: false,
    shipping: address(state, postcode),
    createAccount: false,
    orderNotes: "",
    reviewConsent: false,
    paymentMethod: "cod",
    expected: { lines: [{ variationId: ids.variations.sano1l, qty, unitPricePaise: 29500 }], totalPaise },
  });

  it("places the order without Razorpay: processing, not paid, stock and cart handled, emails say cash", async () => {
    const cart = await makeCart(db, [[ids.variations.sano1l, 2]]);
    currentCart.value = cart;
    sendMail.mockClear();
    const res = await placeOrder(input("DL", "110064", 59000 + 10000), { user: null, ip: "127.0.0.1" }); // ₹590 + ₹100 flat rate
    expect(res.status).toBe(200);
    expect(res.body.ok && res.body.redirect).toMatch(/^\/checkout\/order-received\/[A-Za-z0-9-]+\/\?key=/);

    const order = await db.query.orders.findFirst({ where: eq(schema.orders.email, "cod@example.com") });
    expect(order).toMatchObject({ status: "processing", paymentProvider: "cod", paidAt: null, razorpayOrderId: null, totalPaise: 69000, shippingPaise: 10000 });
    const events = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order!.id));
    expect(events.map((e) => e.type)).toContain("cod");
    expect(await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id))).toHaveLength(0);
    const mails = sendMail.mock.calls.map((c) => c[0]);
    expect(mails.find((m) => m.to === "cod@example.com")?.html).toContain("Please pay in cash when it is delivered");
    expect(mails.find((m) => m.to === "admin@example.com")?.html).toContain("cash on delivery order");
  });

  it("refuses COD where the zone does not allow it (WooCommerce's message) and creates no order", async () => {
    currentCart.value = await makeCart(db, [[ids.variations.sano1l, 2]]);
    const before = (await db.select().from(schema.orders)).length;
    const res = await placeOrder({ ...input("MH", "400001", 59000 + 5000), billing: { ...address("MH", "400001"), email: "nocod@example.com" } }, { user: null, ip: "127.0.0.1" });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ ok: false, code: "payment_method", error: "Invalid payment method." });
    expect((await db.select().from(schema.orders)).length).toBe(before);
  });
});
