import { z } from "zod";
import { clientIp, errorJson, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { findOrderForTracking } from "@/lib/account/orders";

/**
 * POST /api/track-order/  { orderId, email }  ->  { ok: true, order } | { ok: false, error }
 * Order number and billing email must both match. The error never says which one was wrong,
 * so nobody can find out which order numbers exist.
 */
const NOT_FOUND = "Sorry, the order could not be found. Please contact us if you are having difficulty finding your order details.";

const bodySchema = z.object({
  orderId: z
    .string()
    .trim()
    .transform((s) => s.replace(/^#/, "").trim())
    .pipe(z.string().min(1, "Please enter a valid order ID").max(40, "Please enter a valid order ID")),
  email: z.string().trim().min(1, "Please enter a valid email address").max(190, "Please enter a valid email address"),
});

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const ip = await clientIp();
  const limit = rateLimit(`track-order:${ip}`, 10, 10 * 60_000);
  if (!limit.ok) return errorJson("Too many attempts. Please wait a few minutes and try again.", 429, { retryAfter: limit.retryAfterSec });
  const body = await readJson(request, bodySchema);
  if (!body.ok) return body.response;
  const order = await findOrderForTracking(body.data.orderId, body.data.email);
  if (!order) return errorJson(NOT_FOUND, 404);
  return json({ ok: true, order });
}
