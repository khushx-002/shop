import { z } from "zod";
import { applyCoupon, removeCoupon } from "@/lib/cart";
import { clientIp, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ code: z.string().trim().min(1, "Please enter a coupon code.").max(40) });

/** POST /api/cart/coupon/ {code} – apply a coupon */
export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`coupon:${await clientIp()}`, 20, 10 * 60_000);
  if (!rl.ok) return json({ ok: false, error: "Too many coupon attempts. Please try again later.", cart: null }, 429);
  const body = await readJson(request, schema);
  if (!body.ok) return body.response;
  const { cart, error } = await applyCoupon(body.data.code);
  if (error) return json({ ok: false, error, cart }, 400);
  return json({ ok: true, cart, message: "Coupon code applied successfully." });
}

/** DELETE /api/cart/coupon/ – remove the coupon */
export async function DELETE(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const cart = await removeCoupon();
  return json({ ok: true, cart, message: "Coupon has been removed." });
}
