/**
 * Sends "back in stock" emails to people on the waiting list (server only).
 * Used by the waiting-list page and the product edit page.
 */
import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { backInStockEmail } from "@/lib/email-templates";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";

export type NotifyResult = { ok: true; sent: number; failed: number } | { ok: false; error: string };

/**
 * Emails everyone still waiting for a product (variationId = a pack, or null = "any pack").
 * Only works when that product/pack is really in stock. Sets notifiedAt for each email that was sent.
 */
export async function notifyWaitlist(productId: number, variationId: number | null): Promise<NotifyResult> {
  const db = await getDb();
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId), with: { variations: true } });
  if (!product) return { ok: false, error: "The product no longer exists." };
  const sellable = product.variations.filter((v) => v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0));
  const pack = variationId ? product.variations.find((v) => v.id === variationId) : null;
  if (variationId && !pack) return { ok: false, error: "This pack no longer exists." };
  if (variationId ? !sellable.some((v) => v.id === variationId) : sellable.length === 0) {
    return { ok: false, error: "This product is still out of stock. Put it back in stock first, then send the emails." };
  }
  if (product.status !== "publish") return { ok: false, error: "The product is not published, so customers cannot buy it yet." };

  const waiting = await db
    .select()
    .from(schema.waitlist)
    .where(
      and(
        eq(schema.waitlist.productId, productId),
        variationId ? eq(schema.waitlist.variationId, variationId) : isNull(schema.waitlist.variationId),
        isNull(schema.waitlist.notifiedAt),
        eq(schema.waitlist.consent, true),
      ),
    );
  if (!waiting.length) return { ok: false, error: "Nobody is waiting for this product any more." };

  const name = pack ? `${product.name} – ${pack.valueLabel}` : product.name;
  const link = absoluteUrl(pack ? routes.product(product.slug, { slug: pack.attributeSlug, value: pack.valueSlug }) : routes.product(product.slug));
  const mail = backInStockEmail(name, link);

  // One email per address (the same person may have joined twice).
  const byEmail = new Map<string, number[]>();
  for (const w of waiting) byEmail.set(w.email.toLowerCase(), [...(byEmail.get(w.email.toLowerCase()) ?? []), w.id]);

  let sent = 0;
  let failed = 0;
  for (const [email, ids] of byEmail) {
    const res = await sendMail({ to: email, subject: mail.subject, html: mail.html });
    if (res.ok) {
      sent++;
      await db.update(schema.waitlist).set({ notifiedAt: new Date() }).where(inArray(schema.waitlist.id, ids));
    } else {
      failed++;
    }
  }
  return { ok: true, sent, failed };
}
