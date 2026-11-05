import { getCartView } from "@/lib/cart";
import { json } from "@/lib/http";

/** GET /api/cart/ – the current visitor's cart (also tells the header who is logged in). */
export async function GET() {
  const cart = await getCartView();
  return json({ ok: true, cart });
}
