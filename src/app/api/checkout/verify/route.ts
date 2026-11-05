/**
 * POST /api/checkout/verify/ {orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature}
 * Called by the Razorpay popup success handler. Checks the HMAC signature (key secret), that the
 * Razorpay order belongs to our order, then asks Razorpay for the payment (amount, currency, status)
 * and marks the order paid. Returns the thank-you page URL.
 */
import { clientIp, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { routes } from "@/lib/routes";
import { verifyInputSchema } from "@/lib/checkout/schema";
import { confirmPayment, findOrderByNumber, recordOrderEvent } from "@/lib/checkout/orders";
import { isRazorpayConfigured, verifyPaymentSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`checkout-verify:${await clientIp()}`, 30, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, error: "Too many attempts. Please wait a moment." }, 429);
  if (!isRazorpayConfigured()) return json({ ok: false, error: "Online payment is not configured." }, 503);
  const body = await readJson(request, verifyInputSchema);
  if (!body.ok) return body.response;
  const { orderNumber, razorpay_order_id: rzpOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body.data;

  const order = await findOrderByNumber(orderNumber);
  if (!order || !order.razorpayOrderId || order.razorpayOrderId !== rzpOrderId) return json({ ok: false, error: "We could not find this payment for your order." }, 400);
  if (!verifyPaymentSignature({ orderId: rzpOrderId, paymentId, signature })) {
    await recordOrderEvent(order.id, "payment_signature_invalid", `Invalid signature received for payment ${paymentId}.`);
    return json({ ok: false, error: "Payment verification failed. If money was taken, please contact info@jivo.in." }, 400);
  }
  try {
    const result = await confirmPayment(order, paymentId, "checkout");
    if (!result.ok) return json({ ok: false, error: result.error }, result.status);
    return json({ ok: true, redirect: routes.orderReceived(result.order.number, result.order.accessToken) });
  } catch (err) {
    console.error("[checkout] verify failed:", err);
    return json({ ok: false, error: "We could not confirm your payment right now. If money was taken, your order will be confirmed automatically within a few minutes." }, 500);
  }
}
