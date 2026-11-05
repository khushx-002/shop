import { describe, expect, it } from "vitest";
import type { Coupon, ShippingRate } from "@/lib/db/schema";
import { amountToFreeShipping, computeTotals, discountPercent, evaluateCoupon, formatPaise, resolveZone, shippingOptions, subtotalOf, type ZoneWithRates } from "@/lib/pricing";

const NOW = new Date("2026-10-14T12:00:00Z");

function coupon(over: Partial<Coupon> = {}): Coupon {
  return {
    id: 1,
    code: "TEST",
    type: "fixed_cart",
    amount: 20000,
    minSpendPaise: null,
    maxSpendPaise: null,
    expiresAt: null,
    usageLimit: null,
    usedCount: 0,
    perUserLimit: null,
    active: true,
    description: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

let rateId = 1;
function rate(over: Partial<ShippingRate>): ShippingRate {
  return { id: rateId++, zoneId: 0, type: "flat", label: "Flat rate", costPaise: 10000, minOrderPaise: null, enabled: true, sortOrder: 0, ...over };
}

function zone(over: Partial<ZoneWithRates>): ZoneWithRates {
  return { id: 0, name: "Zone", states: [], pincodePrefixes: [], isRestOfCountry: false, enabled: true, codEnabled: false, codUnavailableNotice: null, note: null, sortOrder: 0, rates: [], ...over };
}

describe("evaluateCoupon", () => {
  it("refuses a missing coupon", () => {
    expect(evaluateCoupon(null, 100000, NOW)).toEqual({ ok: false, reason: "Coupon does not exist." });
  });

  it("refuses an inactive coupon", () => {
    const r = evaluateCoupon(coupon({ active: false }), 100000, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not active/);
  });

  it("refuses an expired coupon but accepts one that expires later", () => {
    const expired = evaluateCoupon(coupon({ expiresAt: new Date("2026-10-13T00:00:00Z") }), 100000, NOW);
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toMatch(/expired/);
    expect(evaluateCoupon(coupon({ expiresAt: new Date("2026-10-15T00:00:00Z") }), 100000, NOW).ok).toBe(true);
  });

  it("refuses a coupon whose usage limit is reached", () => {
    const r = evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), 100000, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/usage limit/);
    expect(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 4 }), 100000, NOW).ok).toBe(true);
  });

  it("checks the minimum spend with the old site's message", () => {
    const r = evaluateCoupon(coupon({ minSpendPaise: 500000 }), 499999, NOW);
    expect(r).toEqual({ ok: false, reason: "The minimum spend for this coupon is ₹5000.00." });
    expect(evaluateCoupon(coupon({ minSpendPaise: 500000 }), 500000, NOW).ok).toBe(true);
  });

  it("checks the maximum spend", () => {
    const r = evaluateCoupon(coupon({ maxSpendPaise: 100000 }), 100001, NOW);
    expect(r).toEqual({ ok: false, reason: "The maximum spend for this coupon is ₹1000.00." });
  });

  it("gives a fixed discount, never more than the subtotal", () => {
    const r = evaluateCoupon(coupon({ amount: 20000 }), 549500, NOW);
    expect(r.ok && r.discountPaise).toBe(20000);
    const small = evaluateCoupon(coupon({ amount: 20000 }), 15000, NOW);
    expect(small.ok && small.discountPaise).toBe(15000);
  });

  it("gives a percent discount (rounded to whole paise, capped at 100%)", () => {
    const r = evaluateCoupon(coupon({ type: "percent", amount: 10 }), 109950, NOW);
    expect(r.ok && r.discountPaise).toBe(10995);
    const odd = evaluateCoupon(coupon({ type: "percent", amount: 15 }), 333, NOW);
    expect(odd.ok && odd.discountPaise).toBe(50); // 49.95 -> 50
    const over = evaluateCoupon(coupon({ type: "percent", amount: 150 }), 1000, NOW);
    expect(over.ok && over.discountPaise).toBe(1000);
  });

  it("free-shipping coupons give no discount but free shipping", () => {
    const r = evaluateCoupon(coupon({ type: "free_shipping", amount: 0 }), 50000, NOW);
    expect(r).toMatchObject({ ok: true, discountPaise: 0, freeShipping: true });
  });
});

describe("resolveZone", () => {
  const ncr = zone({ id: 1, name: "NCR", pincodePrefixes: ["110", "122", "201"], sortOrder: 1 });
  const delhiState = zone({ id: 2, name: "Delhi state", states: ["DL"], sortOrder: 2 });
  const mh = zone({ id: 3, name: "MH", states: ["MH"], sortOrder: 3 });
  const rest = zone({ id: 4, name: "Rest", isRestOfCountry: true, sortOrder: 9 });
  const disabledKl = zone({ id: 5, name: "KL", states: ["KL"], enabled: false, sortOrder: 0 });
  const zones = [rest, mh, delhiState, ncr, disabledKl];

  it("PIN prefix beats state", () => {
    expect(resolveZone(zones, "MH", "110027")?.name).toBe("NCR");
    expect(resolveZone(zones, "DL", "110 027")?.name).toBe("NCR"); // spaces in the PIN are ignored
  });

  it("state beats rest of country", () => {
    expect(resolveZone(zones, "mh", "400001")?.name).toBe("MH"); // state code is case-insensitive
    expect(resolveZone(zones, "DL", "999999")?.name).toBe("Delhi state");
  });

  it("falls back to rest of country", () => {
    expect(resolveZone(zones, "KA", "560001")?.name).toBe("Rest");
    expect(resolveZone(zones, null, null)?.name).toBe("Rest");
  });

  it("ignores disabled zones", () => {
    expect(resolveZone(zones, "KL", "682001")?.name).toBe("Rest");
  });

  it("returns null when nothing matches and there is no rest-of-country zone", () => {
    expect(resolveZone([ncr, mh], "KA", "560001")).toBeNull();
  });

  it("ignores empty prefixes (they would match every PIN)", () => {
    const bad = zone({ name: "Bad", pincodePrefixes: [" ", ""], sortOrder: 0 });
    expect(resolveZone([bad, rest], "KA", "560001")?.name).toBe("Rest");
  });

  it("a zone with PIN codes AND states needs both (like the old WooCommerce zones)", () => {
    const delhi = zone({ id: 6, name: "Delhi", states: ["DL"], pincodePrefixes: ["110027", "110064"], sortOrder: 1 });
    const punjab = zone({ id: 7, name: "Punjab", states: ["PB"], sortOrder: 2 });
    const list = [delhi, punjab];
    expect(resolveZone(list, "DL", "110027")?.name).toBe("Delhi");
    expect(resolveZone(list, "HR", "110027")).toBeNull(); // right PIN, wrong state
    expect(resolveZone(list, "DL", "110099")).toBeNull(); // right state, PIN not in the list
    expect(resolveZone(list, "PB", "110027")?.name).toBe("Punjab"); // a state-only zone still matches by state
  });
});

describe("shippingOptions", () => {
  const z = zone({
    rates: [
      rate({ type: "flat", label: "Flat rate", costPaise: 10000, sortOrder: 2 }),
      rate({ type: "free", label: "Free shipping", costPaise: 0, minOrderPaise: 99900, sortOrder: 1 }),
      rate({ type: "flat", label: "Disabled express", costPaise: 5, enabled: false, sortOrder: 3 }),
    ],
  });

  it("no zone -> no options", () => {
    expect(shippingOptions(null, 100000)).toEqual([]);
  });

  it("below the free-shipping threshold only the flat rate is offered", () => {
    const opts = shippingOptions(z, 99899);
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ label: "Flat rate", costPaise: 10000, type: "flat" });
  });

  it("at the threshold free shipping replaces the paid options", () => {
    const opts = shippingOptions(z, 99900);
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ label: "Free shipping", costPaise: 0, type: "free" });
  });

  it("a free-shipping coupon unlocks the zone's free rate below the threshold", () => {
    expect(shippingOptions(z, 100, true)[0]).toMatchObject({ type: "free", costPaise: 0, label: "Free shipping" });
  });

  it("a free-shipping coupon gives free shipping even when the zone has no free rate", () => {
    const flatOnly = zone({ rates: [rate({ type: "flat", costPaise: 5000 })] });
    expect(shippingOptions(flatOnly, 100, true)).toEqual([{ label: "Free shipping", costPaise: 0, rateId: null, type: "free" }]);
  });
});

describe("totals helpers", () => {
  it("subtotalOf multiplies price by quantity", () => {
    expect(
      subtotalOf([
        { variationId: 1, qty: 2, unitPricePaise: 22000, inStock: true },
        { variationId: 2, qty: 1, unitPricePaise: 109900, inStock: true },
      ]),
    ).toBe(153900);
  });

  it("computeTotals subtracts the discount and adds shipping", () => {
    expect(computeTotals(549500, 20000, 0)).toEqual({ subtotalPaise: 549500, discountPaise: 20000, shippingPaise: 0, totalPaise: 529500 });
    expect(computeTotals(44000, 0, 10000).totalPaise).toBe(54000);
  });

  it("computeTotals never goes negative", () => {
    expect(computeTotals(10000, 50000, 0)).toEqual({ subtotalPaise: 10000, discountPaise: 10000, shippingPaise: 0, totalPaise: 0 });
    expect(computeTotals(10000, -500, -100)).toEqual({ subtotalPaise: 10000, discountPaise: 0, shippingPaise: 0, totalPaise: 10000 });
  });

  it("amountToFreeShipping", () => {
    expect(amountToFreeShipping(99900, 44000)).toBe(55900);
    expect(amountToFreeShipping(99900, 120000)).toBe(0);
    expect(amountToFreeShipping(null, 100)).toBe(0);
  });
});

describe("formatPaise", () => {
  it("formats like the old site", () => {
    expect(formatPaise(189900)).toBe("₹1,899.00");
    expect(formatPaise(22000)).toBe("₹220.00");
    expect(formatPaise(0)).toBe("₹0.00");
    expect(formatPaise(50)).toBe("₹0.50");
  });

  it("uses Indian digit grouping (lakh)", () => {
    expect(formatPaise(12345678900)).toBe("₹12,34,56,789.00");
  });

  it("can drop decimals (home spotlight cards)", () => {
    expect(formatPaise(120900, false)).toBe("₹1,209");
  });
});

describe("discountPercent", () => {
  it("rounds to a whole percent", () => {
    expect(discountPercent(375, 220)).toBe(41);
    expect(discountPercent(345, 189.9)).toBe(45);
  });

  it("is 0 when not on sale or the regular price is missing", () => {
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, 1200)).toBe(0);
    expect(discountPercent(0, 100)).toBe(0);
  });
});
