/**
 * Pure server helpers for checkout (no database, no Next.js) so they can be unit tested.
 * Uses node:crypto, so do not import this file in browser code.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { CartTotals } from "@/lib/cart";
import type { CheckoutReview } from "./types";

/**
 * Human order number: prefix + 8 random digits (first digit 1-9), e.g. "JM48203917".
 * Random instead of 1,2,3... so order numbers do not reveal how many orders the shop gets.
 * `rand(min, max)` is injectable for tests.
 */
export function generateOrderNumber(prefix = "JM", rand: (min: number, max: number) => number = randomInt): string {
  const clean = (prefix || "JM").replace(/[^A-Za-z0-9-]/g, "").slice(0, 8) || "JM";
  return `${clean}${rand(10_000_000, 100_000_000)}`;
}

/** Order numbers we accept in URLs and API bodies. */
export const ORDER_NUMBER_RE = /^[A-Za-z0-9-]{3,24}$/;

/** Random 32-character URL-safe token (24 random bytes) for the guest thank-you page link. */
export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Constant-time string comparison (false for different lengths or non-strings). */
export function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Short hash of everything that decides the price of an order (lines, coupon, shipping, total, email).
 * Two checkout attempts with the same fingerprint for the same cart reuse one pending order.
 */
export function cartFingerprint(t: Pick<CartTotals, "lines" | "subtotalPaise" | "discountPaise" | "totalPaise" | "coupon" | "shipping">, email: string): string {
  const parts = [
    t.lines.map((l) => `${l.variationId}x${l.qty}@${l.unitPricePaise}`).join(","),
    t.subtotalPaise,
    t.discountPaise,
    t.coupon?.code ?? "",
    t.shipping ? `${t.shipping.label}:${t.shipping.costPaise}` : "none",
    t.totalPaise,
    email.trim().toLowerCase(),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

/** The order is linked to the cart it came from with an order event "checkout_ref" (no cart column in orders). */
export function formatCartRef(cartId: number, fingerprint: string): string {
  return `cart:${cartId};fp:${fingerprint}`;
}

export function parseCartRef(message: string | null | undefined): { cartId: number; fingerprint: string } | null {
  const m = /^cart:(\d+);fp:([a-f0-9]{8,64})$/.exec(message ?? "");
  return m ? { cartId: Number(m[1]), fingerprint: m[2] } : null;
}

/** Compares what the customer saw with the live cart. Returns true when nothing that affects the price changed. */
export function expectedMatches(
  expected: { lines: { variationId: number; qty: number; unitPricePaise: number }[]; totalPaise: number },
  actual: { lines: { variationId: number; qty: number; unitPricePaise: number }[]; totalPaise: number },
): boolean {
  if (expected.totalPaise !== actual.totalPaise) return false;
  if (expected.lines.length !== actual.lines.length) return false;
  const key = (l: { variationId: number; qty: number; unitPricePaise: number }) => `${l.variationId}x${l.qty}@${l.unitPricePaise}`;
  const a = new Set(actual.lines.map(key));
  return expected.lines.every((l) => a.has(key(l)));
}

/** CartTotals (server) -> the "Your order" box data sent to the browser. */
export function toReview(t: CartTotals, destination: { state: string; postcode: string } | null): CheckoutReview {
  const notices: string[] = [];
  if (t.removed.length) notices.push(`These items are no longer available and were removed from your cart: ${t.removed.join(", ")}.`);
  if (t.couponError) notices.push(t.couponError);
  return {
    lines: t.lines.map((l) => ({
      variationId: l.variationId,
      name: l.name,
      variationLabel: l.variationLabel,
      attributeName: l.attributeName,
      href: l.href,
      image: l.image,
      qty: l.qty,
      maxQty: l.maxQty,
      unitPricePaise: l.unitPricePaise,
      lineTotalPaise: l.lineTotalPaise,
    })),
    subtotalPaise: t.subtotalPaise,
    discountPaise: t.discountPaise,
    coupon: t.coupon,
    shipping: t.shipping ? { label: t.shipping.label, costPaise: t.shipping.costPaise } : null,
    shippingAvailable: t.shippingAvailable,
    destination,
    totalPaise: t.totalPaise,
    notices,
    payment: { cod: t.codAvailable, codNotice: t.codNotice },
  };
}

/** Razorpay amounts are integers in paise; this rejects anything else. */
export function isValidAmountPaise(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 100 && n <= 50_00_000_00; // ₹1 .. ₹50 lakh
}
