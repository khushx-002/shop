import { describe, expect, it } from "vitest";
import { INDIAN_STATES, normalizeIndianPhone, PINCODE_RE, stateName } from "@/lib/india";

describe("normalizeIndianPhone", () => {
  it("accepts 10-digit mobile numbers", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("9876543210");
  });

  it("strips +91, 91 and 0 prefixes and separators", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizeIndianPhone("91-9876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("(+91) 8595-349-565")).toBe("8595349565");
  });

  it("accepts 10-digit landlines with STD code", () => {
    expect(normalizeIndianPhone("011 2345 6789")).toBe("1123456789");
  });

  it("rejects numbers with the wrong length or letters", () => {
    expect(normalizeIndianPhone("98765")).toBeNull();
    expect(normalizeIndianPhone("987654321012")).toBeNull();
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("abcdefghij")).toBeNull();
  });
});

describe("PINCODE_RE", () => {
  it("accepts 6-digit PIN codes that do not start with 0", () => {
    expect(PINCODE_RE.test("110064")).toBe(true);
    expect(PINCODE_RE.test("560001")).toBe(true);
  });

  it("rejects bad PIN codes", () => {
    for (const bad of ["011006", "11006", "1100644", "11006a", "110 064", ""]) expect(PINCODE_RE.test(bad)).toBe(false);
  });
});

describe("stateName / INDIAN_STATES", () => {
  it("maps WooCommerce state codes to names", () => {
    expect(stateName("DL")).toBe("Delhi");
    expect(stateName("MH")).toBe("Maharashtra");
    expect(stateName("TS")).toBe("Telangana");
  });

  it("returns the code itself when unknown and an empty string for nothing", () => {
    expect(stateName("ZZ")).toBe("ZZ");
    expect(stateName(null)).toBe("");
    expect(stateName(undefined)).toBe("");
  });

  it("has all 37 WooCommerce states/UTs with unique codes", () => {
    expect(INDIAN_STATES).toHaveLength(37);
    expect(new Set(INDIAN_STATES.map((s) => s.code)).size).toBe(37);
  });
});
