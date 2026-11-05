/**
 * getCartTotals(db, cart, destination, email) against the in-memory fixture database.
 * Fixture shipping: Delhi NCR (PIN 110/122/201) free >= ₹999 else ₹100; Maharashtra flat ₹50;
 * Kerala zone disabled; Rest of India free >= ₹999 else ₹150. Free-shipping threshold setting: ₹999 (default).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCart, setupTestDb, type FixtureIds } from "../helpers/fixtures";
import { getCartTotals } from "@/lib/cart";
import { schema, type Db } from "@/lib/db";

let db: Db;
let ids: FixtureIds;

beforeAll(async () => {
  ({ db, ids } = await setupTestDb());
});

describe("getCartTotals", () => {
  it("an empty or missing cart has zero totals", async () => {
    const none = await getCartTotals(db, null);
    expect(none).toMatchObject({ lines: [], subtotalPaise: 0, totalPaise: 0, freeShippingThresholdPaise: 99900 });
    const empty = await getCartTotals(db, await makeCart(db, []));
    expect(empty.totalPaise).toBe(0);
  });

  it("uses live database prices and builds the line data", async () => {
    const cart = await makeCart(db, [[ids.variations.canola1l, 2]]);
    const t = await getCartTotals(db, cart, { state: "MH", postcode: "400001" });
    expect(t.lines).toHaveLength(1);
    expect(t.lines[0]).toMatchObject({
      variationId: ids.variations.canola1l,
      name: "Jivo Canola Oil",
      variationLabel: "1 Litre",
      qty: 2,
      unitPricePaise: 22000,
      lineTotalPaise: 44000,
      href: "/product/jivo-canola-oil/?attribute_pa_capacity=1-litre",
      image: "/images/products/canola-front.jpg",
    });
    expect(t.subtotalPaise).toBe(44000);
  });

  describe("shipping zones", () => {
    it("state zone: Maharashtra flat ₹50", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 2]]);
      const t = await getCartTotals(db, cart, { state: "MH", postcode: "400001" });
      expect(t.zoneName).toBe("Maharashtra");
      expect(t.shipping).toMatchObject({ label: "Maharashtra flat rate", costPaise: 5000, type: "flat" });
      expect(t.totalPaise).toBe(49000);
      expect(t.shippingAvailable).toBe(true);
    });

    it("PIN prefix beats state: 110xxx is Delhi NCR even with state MH", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 2]]);
      const t = await getCartTotals(db, cart, { state: "MH", postcode: "110027" });
      expect(t.zoneName).toBe("Delhi NCR");
      expect(t.shipping?.costPaise).toBe(10000);
      expect(t.totalPaise).toBe(54000);
    });

    it("other states use Rest of India; disabled zones are ignored", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 2]]);
      const ka = await getCartTotals(db, cart, { state: "KA", postcode: "560001" });
      expect(ka.zoneName).toBe("Rest of India");
      expect(ka.shipping?.costPaise).toBe(15000);
      const kl = await getCartTotals(db, cart, { state: "KL", postcode: "682001" });
      expect(kl.zoneName).toBe("Rest of India");
    });

    it("free shipping from ₹999", async () => {
      const cart = await makeCart(db, [[ids.variations.canola5l, 1]]);
      const t = await getCartTotals(db, cart, { state: "DL", postcode: "110064" });
      expect(t.shipping).toMatchObject({ type: "free", costPaise: 0 });
      expect(t.totalPaise).toBe(109900);
    });

    it("without an address no shipping is charged yet (like WooCommerce)", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 1]]);
      const t = await getCartTotals(db, cart);
      expect(t.zoneName).toBeNull();
      expect(t.shipping).toBeNull();
      expect(t.shippingOptions).toEqual([]);
      expect(t.shippingAvailable).toBe(true);
      expect(t.totalPaise).toBe(22000);
    });

    it("uses the cart's saved destination when none is passed", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 1]]);
      await db.update(schema.carts).set({ shippingState: "MH", shippingPostcode: "400001" }).where(eq(schema.carts.id, cart.id));
      const fresh = (await db.query.carts.findFirst({ where: eq(schema.carts.id, cart.id) }))!;
      expect((await getCartTotals(db, fresh)).zoneName).toBe("Maharashtra");
    });

    it("reports no shipping when no zone matches", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 1]]);
      await db.update(schema.shippingZones).set({ enabled: false }).where(eq(schema.shippingZones.id, ids.zones.rest));
      try {
        const t = await getCartTotals(db, cart, { state: "KA", postcode: "560001" });
        expect(t.shippingAvailable).toBe(false);
        expect(t.shipping).toBeNull();
        expect(t.shippingOptions).toEqual([]);
      } finally {
        await db.update(schema.shippingZones).set({ enabled: true }).where(eq(schema.shippingZones.id, ids.zones.rest));
      }
    });
  });

  describe("coupons", () => {
    it("JIVO200 below ₹5000 is removed with the minimum-spend reason", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 2]], { coupon: "JIVO200" });
      const t = await getCartTotals(db, cart, { state: "MH", postcode: "400001" });
      expect(t.discountPaise).toBe(0);
      expect(t.coupon).toBeNull();
      expect(t.couponError).toBe('Coupon "JIVO200" was removed: The minimum spend for this coupon is ₹5000.00.');
      const row = await db.query.carts.findFirst({ where: eq(schema.carts.id, cart.id) });
      expect(row?.couponCode).toBeNull();
    });

    it("JIVO200 at ₹5000+ takes ₹200 off; free shipping still applies after the discount", async () => {
      const cart = await makeCart(db, [[ids.variations.canola5l, 5]], { coupon: "jivo200" }); // case-insensitive
      const t = await getCartTotals(db, cart, { state: "DL", postcode: "110064" });
      expect(t.subtotalPaise).toBe(549500);
      expect(t.discountPaise).toBe(20000);
      expect(t.coupon).toMatchObject({ code: "JIVO200", freeShipping: false });
      expect(t.shipping?.costPaise).toBe(0);
      expect(t.totalPaise).toBe(529500);
    });

    it("free shipping threshold is checked after the discount", async () => {
      // ₹1099 - 10% = ₹989.10 < ₹999 -> flat rate is charged
      const cart = await makeCart(db, [[ids.variations.canola5l, 1]], { coupon: "PCT10" });
      const t = await getCartTotals(db, cart, { state: "DL", postcode: "110064" });
      expect(t.discountPaise).toBe(10990);
      expect(t.shipping?.costPaise).toBe(10000);
      expect(t.totalPaise).toBe(109900 - 10990 + 10000);
    });

    it("a free-shipping coupon removes the shipping cost", async () => {
      const cart = await makeCart(db, [[ids.variations.canola1l, 1]], { coupon: "FREESHIP" });
      const t = await getCartTotals(db, cart, { state: "KA", postcode: "560001" });
      expect(t.coupon?.freeShipping).toBe(true);
      expect(t.shipping?.costPaise).toBe(0);
      expect(t.totalPaise).toBe(22000);
    });

    it("expired, inactive and unknown coupons are removed", async () => {
      for (const code of ["EXPIRED", "INACTIVE", "NOPE"]) {
        const cart = await makeCart(db, [[ids.variations.canola1l, 1]], { coupon: code });
        const t = await getCartTotals(db, cart);
        expect(t.discountPaise).toBe(0);
        expect(t.couponError).toMatch(new RegExp(`^Coupon "${code}" was removed`));
      }
    });

    it("per-customer limit: refused when the billing email already used it", async () => {
      const coupon = (await db.query.coupons.findFirst({ where: eq(schema.coupons.code, "ONCE") }))!;
      await db.insert(schema.couponUsages).values({ couponId: coupon.id, email: "Used@Example.com" });
      const cart = await makeCart(db, [[ids.variations.canola1l, 1]], { coupon: "ONCE" });
      const fresh = await getCartTotals(db, cart, null, "new@example.com");
      expect(fresh.discountPaise).toBe(1000);
      const used = await getCartTotals(db, cart, null, "  used@example.COM ");
      expect(used.discountPaise).toBe(0);
      expect(used.couponError).toMatch(/already used this coupon/);
    });
  });

  describe("unavailable items", () => {
    it("removes out-of-stock, hidden-draft and zero-stock items from the cart and lists them", async () => {
      const cart = await makeCart(db, [
        [ids.variations.canola1l, 1],
        [ids.variations.evoo200, 1], // out of stock
        [ids.variations.mustard1l, 1], // managed stock = 0
        [ids.variations.draft1l, 1], // draft product
      ]);
      const t = await getCartTotals(db, cart);
      expect(t.lines.map((l) => l.variationId)).toEqual([ids.variations.canola1l]);
      expect(t.removed).toEqual(["Jivo Extra Virgin Olive Oil – 200 ml", "Jivo Kachi Ghani Mustard Oil – 1 Litre", "Draft Desi Ghee – 1 Litre"]);
      expect(t.subtotalPaise).toBe(22000);
      const left = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
      expect(left.map((i) => i.variationId)).toEqual([ids.variations.canola1l]);
    });

    it("caps the quantity at the stock level for managed-stock packs", async () => {
      await db.update(schema.variations).set({ manageStock: true, stockQty: 3 }).where(eq(schema.variations.id, ids.variations.sano1l));
      try {
        const cart = await makeCart(db, [[ids.variations.sano1l, 10]]);
        const t = await getCartTotals(db, cart);
        expect(t.lines[0]).toMatchObject({ qty: 3, maxQty: 3, lineTotalPaise: 88500 });
        const [item] = await db.select().from(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
        expect(item.qty).toBe(3);
      } finally {
        await db.update(schema.variations).set({ manageStock: false, stockQty: null }).where(eq(schema.variations.id, ids.variations.sano1l));
      }
    });
  });
});
