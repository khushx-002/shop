/**
 * POST /api/checkout/ – "Place order".
 * Validates the form (zod + checkout rules), recomputes totals from the live cart,
 * creates a pending order and a Razorpay order, and returns what the browser needs to open the popup.
 */
import { getSessionUser } from "@/lib/auth/session";
import { clientIp, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { checkoutInputSchema } from "@/lib/checkout/schema";
import { placeOrder } from "@/lib/checkout/orders";

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const ip = await clientIp();
  const rl = rateLimit(`checkout:${ip}`, 12, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, code: "rate_limited", error: `Too many attempts. Please wait ${rl.retryAfterSec} seconds and try again.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const body = await readJson(request, checkoutInputSchema);
  if (!body.ok) return body.response;
  try {
    const user = await getSessionUser();
    const result = await placeOrder(body.data, { user, ip });
    return json(result.body, result.status);
  } catch (err) {
    console.error("[checkout] place order failed:", err);
    return json({ ok: false, error: "Something went wrong while placing your order. Please try again." }, 500);
  }
}
