/**
 * POST /api/checkout/pay/ {orderNumber, key}
 * "Pay now" on the thank-you page of an order that is still waiting for payment:
 * returns the Razorpay popup parameters for that pending order (creates the Razorpay order if needed).
 * The key is the order's private access token from the thank-you link.
 */
import { clientIp, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getDb } from "@/lib/db";
import { payInputSchema } from "@/lib/checkout/schema";
import { NOT_CONFIGURED_MESSAGE, findOrderByNumber, paymentParamsFor } from "@/lib/checkout/orders";
import { safeEqual } from "@/lib/checkout/helpers";
import { isRazorpayConfigured } from "@/lib/razorpay";

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`checkout-pay:${await clientIp()}`, 15, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, error: "Too many attempts. Please wait a moment." }, 429);
  const body = await readJson(request, payInputSchema);
  if (!body.ok) return body.response;
  const order = await findOrderByNumber(body.data.orderNumber);
  if (!order || !safeEqual(body.data.key, order.accessToken)) return json({ ok: false, error: "Order not found." }, 404);
  if (order.status !== "pending_payment") return json({ ok: false, error: "This order is not waiting for payment." }, 409);
  if (!isRazorpayConfigured()) return json({ ok: false, error: NOT_CONFIGURED_MESSAGE }, 503);
  try {
    const payment = await paymentParamsFor(await getDb(), order);
    return json({ ok: true, payment });
  } catch (err) {
    console.error("[checkout] pay again failed:", err);
    return json({ ok: false, error: "We could not start the payment right now. Please try again in a minute." }, 502);
  }
}
