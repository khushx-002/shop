/**
 * POST /api/razorpay/webhook/ – Razorpay server-to-server events.
 * Set up in Razorpay Dashboard -> Settings -> Webhooks with the URL https://<site>/api/razorpay/webhook/,
 * the secret in RAZORPAY_WEBHOOK_SECRET and the events payment.captured, order.paid, payment.failed.
 *
 * Covers customers who pay and close the browser before the thank-you page loads.
 * 400 for a bad signature; 200 for every handled or ignored event (so Razorpay does not retry forever).
 */
import { json, rejectCrossSite } from "@/lib/http";
import { findOrderByRazorpayOrderId, markOrderPaid, recordOrderEvent } from "@/lib/checkout/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

type PaymentEntity = { id: string; order_id: string | null; amount: number; currency: string; status: string; error_description?: string | null };
type WebhookBody = {
  event?: string;
  payload?: { payment?: { entity?: PaymentEntity }; order?: { entity?: { id: string; amount: number; amount_paid?: number; currency: string; status: string } } };
};

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request); // Razorpay sends no Origin header, so this only blocks browsers on other sites
  if (blocked) return blocked;
  if (!(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim()) {
    console.error("[razorpay webhook] RAZORPAY_WEBHOOK_SECRET is not set; event rejected.");
    return json({ ok: false, error: "Webhook not configured." }, 503);
  }
  const raw = await request.text(); // the signature is computed over the exact raw body
  if (raw.length > 1_000_000 || !verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return json({ ok: false, error: "Invalid signature." }, 400);
  }
  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return json({ ok: false, error: "Invalid JSON." }, 400);
  }

  const event = body.event ?? "";
  const payment = body.payload?.payment?.entity;
  const rzpOrder = body.payload?.order?.entity;
  const rzpOrderId = payment?.order_id || rzpOrder?.id || null;

  if (event !== "payment.captured" && event !== "order.paid" && event !== "payment.failed") return json({ ok: true, ignored: event });
  if (!rzpOrderId) return json({ ok: true, ignored: "no order id" });
  const order = await findOrderByRazorpayOrderId(rzpOrderId);
  if (!order) return json({ ok: true, ignored: "unknown order" });

  if (event === "payment.failed") {
    if (order.status === "pending_payment") {
      await recordOrderEvent(order.id, "payment_failed", `Payment ${payment?.id ?? "?"} failed${payment?.error_description ? `: ${payment.error_description}` : ""}.`, "razorpay");
    }
    return json({ ok: true });
  }

  // payment.captured / order.paid
  if (!payment || payment.status !== "captured") return json({ ok: true, ignored: "payment not captured" });
  if (payment.amount !== order.totalPaise || payment.currency !== "INR") {
    await recordOrderEvent(order.id, "payment_mismatch", `Webhook ${event}: payment ${payment.id} amount ${payment.amount} ${payment.currency} does not match the order total ${order.totalPaise} INR.`, "razorpay");
    return json({ ok: true, ignored: "amount mismatch" });
  }
  if (order.status !== "pending_payment") {
    if (order.razorpayPaymentId && order.razorpayPaymentId !== payment.id) {
      await recordOrderEvent(order.id, "payment_duplicate", `Second payment ${payment.id} received for an order already paid with ${order.razorpayPaymentId}. Check and refund in Razorpay.`, "razorpay");
    }
    return json({ ok: true, already: order.status });
  }
  await markOrderPaid(order.id, payment.id, "razorpay-webhook");
  return json({ ok: true });
}
