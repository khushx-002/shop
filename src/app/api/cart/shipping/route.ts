import { z } from "zod";
import { setCartDestination } from "@/lib/cart";
import { json, readJson, rejectCrossSite } from "@/lib/http";
import { INDIAN_STATES } from "@/lib/india";

const schema = z.object({
  state: z.string().refine((s) => INDIAN_STATES.some((x) => x.code === s), "Please select a valid state."),
  postcode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit PIN code."),
});

/** PUT /api/cart/shipping/ {state, postcode} – shipping calculator on the cart page */
export async function PUT(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const body = await readJson(request, schema);
  if (!body.ok) return body.response;
  const cart = await setCartDestination(body.data.state, body.data.postcode);
  return json({ ok: true, cart, message: "Shipping costs updated." });
}
