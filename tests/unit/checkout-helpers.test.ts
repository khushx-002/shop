/**
 * Pure checkout helpers (src/lib/checkout/helpers.ts and validation.ts).
 * Skipped automatically if the checkout files are not present.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const HAS_CHECKOUT = existsSync(path.join(process.cwd(), "src/lib/checkout/helpers.ts")) && existsSync(path.join(process.cwd(), "src/lib/checkout/validation.ts"));

describe.skipIf(!HAS_CHECKOUT)("checkout helpers", async () => {
  const h = await import("@/lib/checkout/helpers");

  it("generateOrderNumber: prefix + 8 digits, prefix cleaned", () => {
    expect(h.generateOrderNumber("JM", () => 48203917)).toBe("JM48203917");
    expect(h.generateOrderNumber("J M<x>", () => 10000000)).toBe("JMx10000000");
    expect(h.generateOrderNumber("", () => 12345678)).toBe("JM12345678");
    expect(h.generateOrderNumber("!!!", () => 12345678)).toBe("JM12345678");
    for (let i = 0; i < 50; i++) {
      const n = h.generateOrderNumber();
      expect(n).toMatch(/^JM[1-9]\d{7}$/);
      expect(h.ORDER_NUMBER_RE.test(n)).toBe(true);
    }
  });

  it("ORDER_NUMBER_RE accepts order numbers and refuses junk", () => {
    expect(h.ORDER_NUMBER_RE.test("JM48203917")).toBe(true);
    expect(h.ORDER_NUMBER_RE.test("12345")).toBe(true);
    for (const bad of ["", "ab", "JM 123", "JM/123", "x".repeat(25), "<script>"]) expect(h.ORDER_NUMBER_RE.test(bad)).toBe(false);
  });

  it("generateAccessToken: 32 URL-safe characters, random", () => {
    const a = h.generateAccessToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(h.generateAccessToken()).not.toBe(a);
  });

  it("safeEqual compares strings only and refuses empty strings", () => {
    expect(h.safeEqual("abc", "abc")).toBe(true);
    expect(h.safeEqual("abc", "abd")).toBe(false);
    expect(h.safeEqual("abc", "abcd")).toBe(false);
    expect(h.safeEqual("", "")).toBe(false);
    expect(h.safeEqual(null, "abc")).toBe(false);
    expect(h.safeEqual(123, 123)).toBe(false);
  });

  const totals = {
    lines: [
      { variationId: 5, qty: 2, unitPricePaise: 22000 },
      { variationId: 9, qty: 1, unitPricePaise: 109900 },
    ],
    subtotalPaise: 153900,
    discountPaise: 0,
    totalPaise: 153900,
    coupon: null,
    shipping: { id: "free", label: "Free shipping", costPaise: 0, type: "free" as const },
  };
  type FpInput = Parameters<typeof h.cartFingerprint>[0];

  it("cartFingerprint: stable, email case-insensitive, changes with price/qty/coupon", () => {
    const fp = h.cartFingerprint(totals as unknown as FpInput, "Buyer@Example.com ");
    expect(fp).toMatch(/^[a-f0-9]{32}$/);
    expect(h.cartFingerprint(totals as unknown as FpInput, "buyer@example.com")).toBe(fp);
    expect(h.cartFingerprint({ ...totals, lines: [{ ...totals.lines[0], qty: 3 }, totals.lines[1]] } as unknown as FpInput, "buyer@example.com")).not.toBe(fp);
    expect(h.cartFingerprint({ ...totals, totalPaise: 153800 } as unknown as FpInput, "buyer@example.com")).not.toBe(fp);
    expect(h.cartFingerprint({ ...totals, coupon: { code: "PCT10", description: null, freeShipping: false } } as unknown as FpInput, "buyer@example.com")).not.toBe(fp);
    expect(h.cartFingerprint(totals as unknown as FpInput, "other@example.com")).not.toBe(fp);
  });

  it("formatCartRef / parseCartRef round trip and reject junk", () => {
    const ref = h.formatCartRef(42, "abcdef0123456789");
    expect(ref).toBe("cart:42;fp:abcdef0123456789");
    expect(h.parseCartRef(ref)).toEqual({ cartId: 42, fingerprint: "abcdef0123456789" });
    expect(h.parseCartRef(null)).toBeNull();
    expect(h.parseCartRef("cart:x;fp:abcdef01")).toBeNull();
    expect(h.parseCartRef("cart:1;fp:XYZ")).toBeNull();
    expect(h.parseCartRef(`${ref};extra`)).toBeNull();
  });

  it("expectedMatches: same lines in any order + same total", () => {
    const actual = { lines: totals.lines, totalPaise: 153900 };
    expect(h.expectedMatches({ lines: [...totals.lines].reverse(), totalPaise: 153900 }, actual)).toBe(true);
    expect(h.expectedMatches({ lines: totals.lines, totalPaise: 153800 }, actual)).toBe(false);
    expect(h.expectedMatches({ lines: [totals.lines[0]], totalPaise: 153900 }, actual)).toBe(false);
    expect(h.expectedMatches({ lines: [{ ...totals.lines[0], unitPricePaise: 21000 }, totals.lines[1]], totalPaise: 153900 }, actual)).toBe(false);
  });

  it("isValidAmountPaise: integers from ₹1 to ₹50 lakh", () => {
    expect(h.isValidAmountPaise(100)).toBe(true);
    expect(h.isValidAmountPaise(50_00_000_00)).toBe(true);
    for (const bad of [99, 50_00_000_01, 100.5, -100, Number.NaN, "100", null]) expect(h.isValidAmountPaise(bad)).toBe(false);
  });
});

describe.skipIf(!HAS_CHECKOUT)("checkout validation", async () => {
  const v = await import("@/lib/checkout/validation");
  const good = { fullName: " Asha  Rani ", company: "", address1: "A-35/1, Mayapuri ", address2: "", city: "New Delhi", state: "dl", postcode: "110 064", phone: "+91 98765 43210", email: " Asha@Example.COM " };
  const blank = { fullName: "", company: "", address1: "", address2: "", city: "", state: "", postcode: "", phone: "", email: "" };

  it("EMAIL_RE", () => {
    expect(v.EMAIL_RE.test("a@b.in")).toBe(true);
    for (const bad of ["a@b", "a b@c.in", "@c.in", "a@.c", "a@b.c"]) expect(v.EMAIL_RE.test(bad)).toBe(false);
  });

  it("cleanPostcode / isValidState", () => {
    expect(v.cleanPostcode(" 110 064 ")).toBe("110064");
    expect(v.cleanPostcode(null)).toBe("");
    expect(v.isValidState("DL")).toBe(true);
    expect(v.isValidState("dl")).toBe(false); // codes are upper case (normalizeAddress upper-cases them)
    expect(v.isValidState("XX")).toBe(false);
  });

  it("normalizeAddress trims, upper-cases the state, cleans PIN/phone/email and drops empty optional fields", () => {
    expect(v.normalizeAddress(good, { withContact: true })).toEqual({
      fullName: "Asha Rani",
      address1: "A-35/1, Mayapuri",
      city: "New Delhi",
      state: "DL",
      postcode: "110064",
      country: "IN",
      phone: "9876543210",
      email: "asha@example.com",
    });
    const noContact = v.normalizeAddress({ ...good, company: "Jivo\u0007 Ltd", address2: "Floor 2" });
    expect(noContact).toMatchObject({ company: "Jivo Ltd", address2: "Floor 2" });
    expect(noContact.phone).toBeUndefined();
    expect(noContact.email).toBeUndefined();
  });

  it("validateCheckoutFields: an empty form lists every required billing field", () => {
    const errors = v.validateCheckoutFields({ billing: blank, shipToDifferent: false, shipping: blank, orderNotes: "" });
    expect(Object.keys(errors).sort()).toEqual(["billing.address1", "billing.city", "billing.email", "billing.fullName", "billing.phone", "billing.postcode", "billing.state"]);
    expect(errors["billing.fullName"]).toBe("Billing Full Name is a required field.");
  });

  it("validateCheckoutFields: a good form passes; bad PIN/phone/email/state are reported", () => {
    expect(v.validateCheckoutFields({ billing: { ...good, state: "DL" }, shipToDifferent: false, shipping: blank, orderNotes: "" })).toEqual({});
    const errors = v.validateCheckoutFields({ billing: { ...good, state: "ZZ", postcode: "011006", phone: "12345", email: "nope" }, shipToDifferent: false, shipping: blank, orderNotes: "" });
    expect(errors["billing.state"]).toMatch(/not valid/);
    expect(errors["billing.postcode"]).toMatch(/not a valid postcode/);
    expect(errors["billing.phone"]).toMatch(/not a valid phone/);
    expect(errors["billing.email"]).toMatch(/not a valid email/);
  });

  it("validateCheckoutFields: shipping address only checked when shipping to a different address (no phone/email needed)", () => {
    const billing = { ...good, state: "DL" };
    expect(v.validateCheckoutFields({ billing, shipToDifferent: false, shipping: blank, orderNotes: "" })).toEqual({});
    const errors = v.validateCheckoutFields({ billing, shipToDifferent: true, shipping: blank, orderNotes: "" });
    expect(Object.keys(errors).sort()).toEqual(["shipping.address1", "shipping.city", "shipping.fullName", "shipping.postcode", "shipping.state"]);
  });

  it("validateCheckoutFields: order notes limit", () => {
    const errors = v.validateCheckoutFields({ billing: { ...good, state: "DL" }, shipToDifferent: false, shipping: blank, orderNotes: "x".repeat(1001) });
    expect(errors.orderNotes).toMatch(/at most 1000/);
  });

  it("shippingDestination / isCompleteDestination", () => {
    const billing = { ...good, state: "dl" };
    const shipping = { ...blank, state: "mh", postcode: "400 001" };
    expect(v.shippingDestination({ billing, shipToDifferent: false, shipping })).toEqual({ state: "DL", postcode: "110064" });
    expect(v.shippingDestination({ billing, shipToDifferent: true, shipping })).toEqual({ state: "MH", postcode: "400001" });
    expect(v.isCompleteDestination({ state: "MH", postcode: "400001" })).toBe(true);
    expect(v.isCompleteDestination({ state: "MH", postcode: "4000" })).toBe(false);
    expect(v.isCompleteDestination({ state: "", postcode: "400001" })).toBe(false);
  });
});
