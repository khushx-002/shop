/**
 * POST /api/newsletter/  { email, website }  – footer "Sign up to our newsletter" form.
 *
 * - Cross-site requests are refused, max 5 sign-ups per IP per 10 minutes.
 * - `website` is a honeypot: people never see it, bots fill it in. A filled honeypot gets the
 *   normal success answer (so bots learn nothing) but nothing is saved.
 * - Already subscribed addresses get the same answer (no way to test who is on the list).
 */
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { clientIp, errorJson, json, readJson, rejectCrossSite } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(190, "Please enter a valid email address.").email("Please enter a valid email address."),
  website: z.string().max(200).optional().default(""),
});

const SUCCESS = { ok: true, message: "Thank you for subscribing!" } as const;

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const rl = rateLimit(`newsletter:${await clientIp()}`, 5, 10 * 60_000);
  if (!rl.ok) {
    return errorJson("Too many attempts. Please try again in a few minutes.", 429, { retryAfter: rl.retryAfterSec });
  }

  const parsed = await readJson(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { email, website } = parsed.data;
  if (website) return json(SUCCESS);

  try {
    const db = await getDb();
    await db.insert(schema.newsletterSubscribers).values({ email, source: "footer" }).onConflictDoNothing({ target: schema.newsletterSubscribers.email });
  } catch (err) {
    console.error("newsletter signup failed", err);
    return errorJson("Sorry, we could not save your subscription right now. Please try again later.", 500);
  }
  return json(SUCCESS);
}
