import { describe, expect, it } from "vitest";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("round trip: the right password verifies", async () => {
    const stored = await hashPassword("Jivo-Canola-2026");
    expect(stored).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("Jivo-Canola-2026", stored)).toBe(true);
  });

  it("a wrong password does not verify", async () => {
    const stored = await hashPassword("Jivo-Canola-2026");
    expect(await verifyPassword("jivo-canola-2026", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("uses a random salt (same password -> different hashes)", async () => {
    const [a, b] = await Promise.all([hashPassword("Same-pass-1"), hashPassword("Same-pass-1")]);
    expect(a).not.toBe(b);
  });

  it("treats Unicode compatibility forms the same (NFKC)", async () => {
    const stored = await hashPassword("ｐａｓｓ1234"); // full-width letters
    expect(await verifyPassword("pass1234", stored)).toBe(true);
  });

  it("rejects missing or malformed stored hashes (e.g. imported WordPress hashes)", async () => {
    expect(await verifyPassword("anything1", null)).toBe(false);
    expect(await verifyPassword("anything1", undefined)).toBe(false);
    expect(await verifyPassword("anything1", "$P$BOLDWORDPRESSHASH")).toBe(false);
    expect(await verifyPassword("anything1", "scrypt$1$2$3")).toBe(false);
  });
});

describe("passwordProblem", () => {
  it("accepts a good password", () => {
    expect(passwordProblem("abcdefg1")).toBeNull();
  });

  it("needs at least 8 characters", () => {
    expect(passwordProblem("abc12")).toMatch(/at least 8 characters/);
  });

  it("needs a letter and a number", () => {
    expect(passwordProblem("abcdefgh")).toMatch(/one letter and one number/);
    expect(passwordProblem("12345678")).toMatch(/one letter and one number/);
  });

  it("refuses very long passwords", () => {
    expect(passwordProblem("a1".repeat(101))).toMatch(/too long/);
  });
});
