/**
 * Razorpay signature helpers with known HMAC-SHA256 vectors.
 * Skipped automatically if src/lib/razorpay.ts is not present.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const HAS_RAZORPAY = existsSync(path.join(process.cwd(), "src/lib/razorpay.ts"));

// RFC 4231 test case 2
const RFC_KEY = "Jefe";
const RFC_DATA = "what do ya want for nothing?";
const RFC_HMAC = "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843";

// Values computed once with node:crypto (createHmac("sha256", secret).update(data).digest("hex"))
const SECRET = "test_secret_123";
const ORDER_ID = "order_IEIaMR65cu6nz3";
const PAYMENT_ID = "pay_IH4NVgf4Dreq1l";
const PAYMENT_SIG = "786b00c7dff826ce06da31247e6221d916483339013f60d7a60d61371cf1d307";
const WEBHOOK_SECRET = "whsec_test";
const WEBHOOK_BODY = '{"event":"payment.captured","payload":{}}';
const WEBHOOK_SIG = "09873f612c535c8d3b2de754fd0befb1c0efac0ffcbea2c60de522e3d4ba045c";

describe.skipIf(!HAS_RAZORPAY)("razorpay signatures", async () => {
  const rzp = await import("@/lib/razorpay");
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("hmacSha256Hex matches RFC 4231", () => {
    expect(rzp.hmacSha256Hex(RFC_DATA, RFC_KEY)).toBe(RFC_HMAC);
  });

  it("safeEqualHex: case-insensitive, refuses non-hex / other lengths / non-strings", () => {
    expect(rzp.safeEqualHex(RFC_HMAC, RFC_HMAC.toUpperCase())).toBe(true);
    expect(rzp.safeEqualHex(RFC_HMAC, RFC_HMAC.slice(0, -1))).toBe(false);
    expect(rzp.safeEqualHex(RFC_HMAC, RFC_HMAC.slice(0, -1) + "z")).toBe(false);
    expect(rzp.safeEqualHex(RFC_HMAC, "")).toBe(false);
    expect(rzp.safeEqualHex(RFC_HMAC, undefined)).toBe(false);
    expect(rzp.safeEqualHex(RFC_HMAC, 42)).toBe(false);
  });

  it("verifyPaymentSignature: HMAC(order_id|payment_id, key secret)", () => {
    expect(rzp.verifyPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: PAYMENT_SIG }, SECRET)).toBe(true);
    expect(rzp.verifyPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: PAYMENT_SIG }, "wrong")).toBe(false);
    expect(rzp.verifyPaymentSignature({ orderId: ORDER_ID, paymentId: "pay_other", signature: PAYMENT_SIG }, SECRET)).toBe(false);
    // swapped order of the ids must fail
    expect(rzp.verifyPaymentSignature({ orderId: PAYMENT_ID, paymentId: ORDER_ID, signature: PAYMENT_SIG }, SECRET)).toBe(false);
    expect(rzp.verifyPaymentSignature({ orderId: "", paymentId: PAYMENT_ID, signature: PAYMENT_SIG }, SECRET)).toBe(false);
    expect(rzp.verifyPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: PAYMENT_SIG }, "")).toBe(false);
  });

  it("verifyPaymentSignature uses RAZORPAY_KEY_SECRET by default and fails closed without it", () => {
    process.env.RAZORPAY_KEY_SECRET = SECRET;
    expect(rzp.verifyPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: PAYMENT_SIG })).toBe(true);
    process.env.RAZORPAY_KEY_SECRET = "";
    expect(rzp.verifyPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature: PAYMENT_SIG })).toBe(false);
  });

  it("verifyWebhookSignature: HMAC(raw body, webhook secret)", () => {
    expect(rzp.verifyWebhookSignature(WEBHOOK_BODY, WEBHOOK_SIG, WEBHOOK_SECRET)).toBe(true);
    expect(rzp.verifyWebhookSignature(WEBHOOK_BODY + " ", WEBHOOK_SIG, WEBHOOK_SECRET)).toBe(false); // body changed
    expect(rzp.verifyWebhookSignature(WEBHOOK_BODY, null, WEBHOOK_SECRET)).toBe(false);
    expect(rzp.verifyWebhookSignature(WEBHOOK_BODY, WEBHOOK_SIG, "")).toBe(false);
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    expect(rzp.verifyWebhookSignature(WEBHOOK_BODY, WEBHOOK_SIG)).toBe(true);
  });

  it("isRazorpayConfigured needs both the key id and the secret", () => {
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "";
    process.env.RAZORPAY_KEY_SECRET = "";
    expect(rzp.isRazorpayConfigured()).toBe(false);
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_abc";
    expect(rzp.isRazorpayConfigured()).toBe(false);
    process.env.RAZORPAY_KEY_SECRET = "  ";
    expect(rzp.isRazorpayConfigured()).toBe(false); // spaces only
    process.env.RAZORPAY_KEY_SECRET = "secret";
    expect(rzp.isRazorpayConfigured()).toBe(true);
  });
});
