/**
 * Pure pricing rules (no database, no framework) so they can be unit tested.
 * All amounts are integers in paise.
 */
import type { Coupon, ShippingRate, ShippingZone } from "@/lib/db/schema";

export type PricedLine = { variationId: number; qty: number; unitPricePaise: number; inStock: boolean };

export type CouponResult =
  | { ok: true; discountPaise: number; freeShipping: boolean; coupon: Coupon }
  | { ok: false; reason: string };

export function subtotalOf(lines: PricedLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
}

/** Validates a coupon against a subtotal. Mirrors the WooCommerce rules the shop used. */
export function evaluateCoupon(coupon: Coupon | null | undefined, subtotalPaise: number, now = new Date()): CouponResult {
  if (!coupon) return { ok: false, reason: "Coupon does not exist." };
  if (!coupon.active) return { ok: false, reason: "This coupon is not active." };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) return { ok: false, reason: "This coupon has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, reason: "Coupon usage limit has been reached." };
  if (coupon.minSpendPaise != null && subtotalPaise < coupon.minSpendPaise) {
    return { ok: false, reason: `The minimum spend for this coupon is ₹${(coupon.minSpendPaise / 100).toFixed(2)}.` };
  }
  if (coupon.maxSpendPaise != null && subtotalPaise > coupon.maxSpendPaise) {
    return { ok: false, reason: `The maximum spend for this coupon is ₹${(coupon.maxSpendPaise / 100).toFixed(2)}.` };
  }
  if (coupon.type === "free_shipping") return { ok: true, discountPaise: 0, freeShipping: true, coupon };
  if (coupon.type === "percent") {
    const pct = Math.min(100, Math.max(0, coupon.amount));
    return { ok: true, discountPaise: Math.round((subtotalPaise * pct) / 100), freeShipping: false, coupon };
  }
  return { ok: true, discountPaise: Math.min(subtotalPaise, Math.max(0, coupon.amount)), freeShipping: false, coupon };
}

export type ZoneWithRates = ShippingZone & { rates: ShippingRate[] };

/**
 * Picks the shipping zone for an Indian address: pincode prefix first, then state, then "rest of country".
 * A zone with BOTH pincodes and states needs both to match (like WooCommerce zones on the old site:
 * "Delhi + 110027" is in the Delhi zone, "Haryana + 110027" is not).
 */
export function resolveZone(zones: ZoneWithRates[], state: string | null | undefined, postcode: string | null | undefined): ZoneWithRates | null {
  const enabled = zones.filter((z) => z.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const pin = (postcode || "").replace(/\s+/g, "");
  const st = (state || "").toUpperCase();
  const stateMatches = (z: ZoneWithRates) => !!st && z.states.map((s) => s.toUpperCase()).includes(st);
  for (const z of enabled) {
    if (z.pincodePrefixes.length && pin && z.pincodePrefixes.some((p) => p.trim() !== "" && pin.startsWith(p.trim())) && (!z.states.length || stateMatches(z))) return z;
  }
  for (const z of enabled) {
    if (z.states.length && !z.pincodePrefixes.length && stateMatches(z)) return z;
  }
  return enabled.find((z) => z.isRestOfCountry) || null;
}

export type ShippingChoice = { label: string; costPaise: number; rateId: number | null; type: "flat" | "free" };

/** Returns the shipping options for a zone. Free shipping wins when its minimum is reached. */
export function shippingOptions(zone: ZoneWithRates | null, subtotalAfterDiscountPaise: number, couponFreeShipping = false): ShippingChoice[] {
  if (!zone) return [];
  const rates = zone.rates.filter((r) => r.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const free = rates.find((r) => r.type === "free" && (couponFreeShipping || r.minOrderPaise == null || subtotalAfterDiscountPaise >= r.minOrderPaise));
  if (free) return [{ label: free.label, costPaise: 0, rateId: free.id, type: "free" }];
  if (couponFreeShipping) return [{ label: "Free shipping", costPaise: 0, rateId: null, type: "free" }];
  return rates.filter((r) => r.type === "flat").map((r) => ({ label: r.label, costPaise: r.costPaise, rateId: r.id, type: "flat" as const }));
}

/** Amount still needed to unlock free shipping (for the progress bar), or 0 when reached. */
export function amountToFreeShipping(freeShippingMinPaise: number | null, subtotalPaise: number): number {
  if (freeShippingMinPaise == null) return 0;
  return Math.max(0, freeShippingMinPaise - subtotalPaise);
}

export type Totals = { subtotalPaise: number; discountPaise: number; shippingPaise: number; totalPaise: number };

export function computeTotals(subtotalPaise: number, discountPaise: number, shippingPaise: number): Totals {
  const discount = Math.min(subtotalPaise, Math.max(0, discountPaise));
  const total = Math.max(0, subtotalPaise - discount + Math.max(0, shippingPaise));
  return { subtotalPaise, discountPaise: discount, shippingPaise: Math.max(0, shippingPaise), totalPaise: total };
}

export function paise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function rupees(paiseAmount: number): number {
  return paiseAmount / 100;
}

/** "₹1,899.00" - same format as the old site. */
export function formatPaise(paiseAmount: number, decimals = true): string {
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 }).format(paiseAmount / 100)
  );
}

export function discountPercent(regularPaise: number, salePaise: number): number {
  if (regularPaise <= 0 || salePaise >= regularPaise) return 0;
  return Math.round(((regularPaise - salePaise) / regularPaise) * 100);
}
