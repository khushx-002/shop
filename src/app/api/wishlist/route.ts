import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { errorJson, json, readJson, rejectCrossSite } from "@/lib/http";

/** GET /api/wishlist/ – product ids saved to the logged-in customer's wishlist */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ ok: true, productIds: [], loggedIn: false });
  const db = await getDb();
  const rows = await db.select().from(schema.wishlists).where(eq(schema.wishlists.userId, user.id));
  return json({ ok: true, productIds: rows.map((r) => r.productId), loggedIn: true });
}

const putSchema = z.object({ productIds: z.array(z.number().int().positive()).max(100) });

/** PUT /api/wishlist/ {productIds} – replaces the customer's saved wishlist */
export async function PUT(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const user = await getSessionUser();
  if (!user) return errorJson("Please log in to save your wishlist.", 401);
  const body = await readJson(request, putSchema);
  if (!body.ok) return body.response;
  const db = await getDb();
  const ids = [...new Set(body.data.productIds)];
  const existing = ids.length ? await db.select({ id: schema.products.id }).from(schema.products).where(inArray(schema.products.id, ids)) : [];
  const valid = ids.filter((id) => existing.some((e) => e.id === id));
  await db.transaction(async (tx) => {
    await tx.delete(schema.wishlists).where(eq(schema.wishlists.userId, user.id));
    if (valid.length) await tx.insert(schema.wishlists).values(valid.map((productId) => ({ userId: user.id, productId }))).onConflictDoNothing();
  });
  return json({ ok: true, productIds: valid });
}
