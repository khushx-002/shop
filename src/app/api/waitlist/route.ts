import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { clientIp, errorJson, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  productId: z.number().int().positive(),
  variationId: z.number().int().positive().nullable().optional(),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(190),
  consent: z.literal(true, { message: "Please tick the box to agree to be contacted." }),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

/**
 * POST /api/waitlist/ {productId, variationId?, email, consent: true}
 * "Join waiting list" for out-of-stock products. The admin sends the back-in-stock email later.
 */
export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`waitlist:${await clientIp()}`, 10, 60 * 60_000);
  if (!rl.ok) return errorJson("Too many requests. Please try again later.", 429);
  const body = await readJson(request, bodySchema);
  if (!body.ok) return body.response;
  const { productId, variationId, email } = body.data;
  const db = await getDb();
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId) });
  if (!product) return errorJson("Product not found.", 404);
  if (variationId) {
    const v = await db.query.variations.findFirst({ where: and(eq(schema.variations.id, variationId), eq(schema.variations.productId, productId)) });
    if (!v) return errorJson("Product option not found.", 404);
  }
  const existing = await db.query.waitlist.findFirst({
    where: and(eq(schema.waitlist.productId, productId), eq(schema.waitlist.email, email), variationId ? eq(schema.waitlist.variationId, variationId) : isNull(schema.waitlist.variationId), isNull(schema.waitlist.notifiedAt)),
  });
  if (!existing) await db.insert(schema.waitlist).values({ productId, variationId: variationId ?? null, email, consent: true });
  return json({ ok: true, message: "You have joined the waiting list. We will email you as soon as this product is back in stock." });
}
