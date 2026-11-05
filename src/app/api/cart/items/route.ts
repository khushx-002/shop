import { z } from "zod";
import { addToCart, CartError, getCartView, setCartQty } from "@/lib/cart";
import { json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";

const addSchema = z.object({ variationId: z.number().int().positive(), qty: z.number().int().min(1).max(999).default(1) });
const setSchema = z.object({ variationId: z.number().int().positive(), qty: z.number().int().min(0).max(999) });
const delSchema = z.object({ variationId: z.number().int().positive() });

async function guard(request: Request): Promise<Response | null> {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`cart:${await clientIp()}`, 120, 60_000);
  if (!rl.ok) return json({ ok: false, error: "Too many requests. Please slow down.", cart: null }, 429);
  return null;
}

async function respond(fn: () => Promise<Awaited<ReturnType<typeof getCartView>>>, message?: string) {
  try {
    const cart = await fn();
    return json({ ok: true, cart, message });
  } catch (e) {
    if (e instanceof CartError) return json({ ok: false, error: e.message, cart: await getCartView() }, 400);
    throw e;
  }
}

/** POST /api/cart/items/ {variationId, qty} – add to cart */
export async function POST(request: Request) {
  const g = await guard(request);
  if (g) return g;
  const body = await readJson(request, addSchema);
  if (!body.ok) return body.response;
  return respond(() => addToCart(body.data.variationId, body.data.qty), "Product added to cart.");
}

/** PATCH /api/cart/items/ {variationId, qty} – change quantity (0 removes) */
export async function PATCH(request: Request) {
  const g = await guard(request);
  if (g) return g;
  const body = await readJson(request, setSchema);
  if (!body.ok) return body.response;
  return respond(() => setCartQty(body.data.variationId, body.data.qty), "Cart updated.");
}

/** DELETE /api/cart/items/ {variationId} – remove a line */
export async function DELETE(request: Request) {
  const g = await guard(request);
  if (g) return g;
  const body = await readJson(request, delSchema);
  if (!body.ok) return body.response;
  return respond(() => setCartQty(body.data.variationId, 0), "Item removed.");
}
