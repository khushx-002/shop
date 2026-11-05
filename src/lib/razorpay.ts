/**
 * Tiny Razorpay REST client (server only) using fetch + HTTP Basic auth.
 *
 * Env:
 *   NEXT_PUBLIC_RAZORPAY_KEY_ID   key id (public, also used by the browser popup)
 *   RAZORPAY_KEY_SECRET           key secret (server only – never send it to the browser)
 *   RAZORPAY_WEBHOOK_SECRET       secret set in Razorpay -> Settings -> Webhooks
 *   RAZORPAY_API_BASE             optional, default https://api.razorpay.com (tests can point it to a mock)
 *
 * The signature helpers are pure (secret passed in) so they can be unit tested.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string | null; status: string; notes?: Record<string, string> };

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  email?: string;
  contact?: string;
  error_description?: string | null;
};

export class RazorpayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function keyId(): string {
  return (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
}
function keySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET || "").trim();
}
function apiBase(): string {
  return (process.env.RAZORPAY_API_BASE || "https://api.razorpay.com").replace(/\/+$/, "");
}

/** True when both API keys are set (the checkout can take payments). */
export function isRazorpayConfigured(): boolean {
  return keyId().length > 0 && keySecret().length > 0;
}

/** Public key id for the browser popup (empty string when not configured). */
export function publicKeyId(): string {
  return keyId();
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!isRazorpayConfigured()) throw new RazorpayError("Razorpay is not configured.", 503);
  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new RazorpayError(`Could not reach Razorpay: ${err instanceof Error ? err.message : "network error"}`, 502);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const desc = (data as { error?: { description?: string } } | null)?.error?.description;
    throw new RazorpayError(desc || `Razorpay error ${res.status}`, res.status);
  }
  return data as T;
}

/** POST /v1/orders – amount in paise. */
export function createRazorpayOrder(input: { amount: number; currency?: "INR"; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  return request<RazorpayOrder>("POST", "/v1/orders", { amount: input.amount, currency: input.currency ?? "INR", receipt: input.receipt.slice(0, 40), notes: input.notes ?? {} });
}

/** GET /v1/payments/:id */
export function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return request<RazorpayPayment>("GET", `/v1/payments/${encodeURIComponent(paymentId)}`);
}

/** POST /v1/payments/:id/capture – needed when the account is not set to auto-capture. */
export function capturePayment(paymentId: string, amount: number, currency: "INR" = "INR"): Promise<RazorpayPayment> {
  return request<RazorpayPayment>("POST", `/v1/payments/${encodeURIComponent(paymentId)}/capture`, { amount, currency });
}

/* ---------------- signatures (pure) ---------------- */

/** HMAC-SHA256 as lower-case hex. */
export function hmacSha256Hex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

/** Constant-time compare of two hex strings. */
export function safeEqualHex(expectedHex: string, givenHex: unknown): boolean {
  if (typeof givenHex !== "string" || !/^[a-f0-9]+$/i.test(givenHex)) return false;
  const a = Buffer.from(expectedHex.toLowerCase(), "utf8");
  const b = Buffer.from(givenHex.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checks the signature Razorpay's popup returns: HMAC(order_id + "|" + payment_id, key secret). */
export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }, secret: string = keySecret()): boolean {
  if (!secret || !input.orderId || !input.paymentId) return false;
  return safeEqualHex(hmacSha256Hex(`${input.orderId}|${input.paymentId}`, secret), input.signature);
}

/** Checks the X-Razorpay-Signature header of a webhook: HMAC(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim()): boolean {
  if (!secret || !signature) return false;
  return safeEqualHex(hmacSha256Hex(rawBody, secret), signature);
}
