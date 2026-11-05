import { z } from "zod";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { clientIp, errorJson, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1, "Please choose a rating.").max(5, "Please choose a rating."),
  body: z.string().trim().min(10, "Please write at least 10 characters.").max(3000, "Please keep your review under 3000 characters."),
  authorName: z.string().trim().min(2, "Please enter your name.").max(80, "Name is too long."),
  authorEmail: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(190),
  website: z.string().max(0, "Your review could not be sent. Please reload the page and try again.").optional(), // honeypot: must stay empty
});

/** Order statuses that mean the customer really paid. */
const PAID = ["paid", "processing", "shipped", "completed"] as const;

/** Removes control characters (keeps new lines and tabs) so stored text stays clean. React escapes it on display. */
function clean(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

/**
 * POST /api/reviews/ {productId, rating, body, authorName, authorEmail, website}
 * Saves a product review as "pending"; an admin approves it before it is shown.
 * "Verified owner" is set only when a paid order with this email contains the product.
 */
export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;
  const rl = rateLimit(`reviews:${await clientIp()}`, 5, 60 * 60_000);
  if (!rl.ok) return errorJson("Too many reviews sent from your connection. Please try again later.", 429);

  const parsed = await readJson(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { productId, rating, body, authorName, authorEmail } = parsed.data;

  const db = await getDb();
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId), columns: { id: true } });
  if (!product) return errorJson("Product not found.", 404);

  // Verified owner: the LOGGED-IN customer has a paid order with this product (by account or account email).
  // Typing someone else's email is not enough.
  const user = await getSessionUser();
  const bought = !user
    ? []
    : await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
    .where(
          and(
            or(eq(schema.orders.userId, user.id), eq(sql`lower(${schema.orders.email})`, user.email.toLowerCase())),
            inArray(schema.orders.status, [...PAID]),
            eq(schema.orderItems.productId, productId),
          ),
        )
        .limit(1);

  await db.insert(schema.reviews).values({
    productId,
    authorName: clean(authorName),
    authorEmail,
    rating,
    body: clean(body),
    verified: bought.length > 0,
    status: "pending",
  });

  return json({ ok: true, message: "Thank you! Your review is awaiting approval." });
}
