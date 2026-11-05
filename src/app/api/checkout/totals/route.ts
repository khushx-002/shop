/**
 * POST /api/checkout/totals/ {state, postcode, email?}
 * Recalculates the "Your order" box (shipping, coupon, total) for the address typed on the checkout page.
 * POST because getCartTotals() may update the cart (removes sold-out items / invalid coupons).
 */
import { getSessionUser } from "@/lib/auth/session";
import { clientIp, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { totalsInputSchema } from "@/lib/checkout/schema";
import { computeReview } from "@/lib/checkout/orders";
import { cleanPostcode, EMAIL_RE } from "@/lib/checkout/validation";

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`checkout-totals:${await clientIp()}`, 90, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, error: "Too many requests. Please wait a moment." }, 429);
  const body = await readJson(request, totalsInputSchema);
  if (!body.ok) return body.response;
  const email = body.data.email?.trim().toLowerCase();
  const review = await computeReview(await getSessionUser(), { state: body.data.state.toUpperCase(), postcode: cleanPostcode(body.data.postcode) }, email && EMAIL_RE.test(email) ? email : null);
  return json({ ok: true, review });
}
