"use server";
/**
 * Admin product actions: edit product texts, flags and packs (variations); notify the waiting list.
 * After saving, the storefront catalog cache and the affected pages are refreshed.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { routes } from "@/lib/routes";
import { adminAction } from "../auth";
import { checkbox, fail, formObject, idField, ok, optionalInt, optionalText, parseForm, requiredText, rupeesRequired } from "../form";
import { notifyWaitlist } from "../waitlist";

const productSchema = z.object({
  productId: idField,
  name: requiredText(200, "Name"),
  visible: checkbox,
  featured: checkbox,
  tagline: optionalText(200, "Tagline"),
  shortDescriptionHtml: optionalText(20_000, "Short description"),
  descriptionHtml: optionalText(200_000, "Description"),
  disclaimerHtml: optionalText(20_000, "Disclaimer"),
  seoTitle: optionalText(200, "SEO title"),
  seoDescription: optionalText(320, "SEO description"),
  estimatedDelivery: optionalText(60, "Estimated delivery"),
});

const variationSchema = z.object({
  label: requiredText(120, "Pack label"),
  sku: optionalText(80, "SKU"),
  price: rupeesRequired("Sale price"),
  regular: rupeesRequired("Regular price"),
  inStock: checkbox,
  manageStock: checkbox,
  stockQty: optionalInt("Stock quantity", 0, 1_000_000),
});

/** Refreshes every storefront page that can show this product. */
async function revalidateProduct(productId: number) {
  const db = await getDb();
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId), with: { productCategories: { with: { category: true } } } });
  revalidateTag("catalog", "max");
  if (!product) return;
  revalidatePath(routes.product(product.slug));
  revalidatePath(routes.shop);
  revalidatePath("/");
  for (const pc of product.productCategories) revalidatePath(routes.category(pc.category.slug));
}

export async function updateProductAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const raw = formObject(formData);
    const parsed = parseForm(productSchema, raw);
    if (!parsed.ok) return parsed.state;
    const data = parsed.data;
    const db = await getDb();
    const product = await db.query.products.findFirst({ where: eq(schema.products.id, data.productId), with: { variations: true } });
    if (!product) return fail("This product no longer exists.");

    // Packs: fields are named "v.<id>.<field>"; only packs of this product are accepted.
    const fieldErrors: Record<string, string> = {};
    const updates: { id: number; values: Partial<typeof schema.variations.$inferInsert> }[] = [];
    const backInStock: string[] = [];
    for (const v of product.variations) {
      const prefix = `v.${v.id}.`;
      const vRaw: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(raw)) if (k.startsWith(prefix)) vRaw[k.slice(prefix.length)] = val;
      if (!("label" in vRaw)) continue; // pack not in the form (should not happen)
      const vp = variationSchema.safeParse(vRaw);
      if (!vp.success) {
        for (const issue of vp.error.issues) fieldErrors[`${prefix}${issue.path.join(".")}`] ??= issue.message;
        continue;
      }
      const d = vp.data;
      if (d.price > d.regular) fieldErrors[`${prefix}price`] = "The sale price cannot be higher than the regular price.";
      if (d.price <= 0) fieldErrors[`${prefix}price`] = "The price must be more than ₹0.";
      if (d.manageStock && d.stockQty == null) fieldErrors[`${prefix}stockQty`] = "Enter the stock quantity (or turn off Manage stock).";
      // With "manage stock" on, in stock follows the quantity (same rule as WooCommerce).
      const inStock = d.manageStock ? (d.stockQty ?? 0) > 0 : d.inStock;
      const wasSellable = v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0);
      if (!wasSellable && inStock) backInStock.push(d.label);
      updates.push({
        id: v.id,
        values: {
          valueLabel: d.label,
          sku: d.sku,
          pricePaise: d.price,
          regularPricePaise: d.regular,
          manageStock: d.manageStock,
          stockQty: d.manageStock ? d.stockQty : v.stockQty,
          inStock,
          updatedAt: new Date(),
        },
      });
    }
    if (Object.keys(fieldErrors).length) return fail("Please fix the highlighted pack fields.", fieldErrors);

    const { productId, ...fields } = data;
    await db.update(schema.products).set({ ...fields, updatedAt: new Date() }).where(eq(schema.products.id, productId));
    for (const u of updates) await db.update(schema.variations).set(u.values).where(eq(schema.variations.id, u.id));

    await revalidateProduct(productId);
    revalidatePath("/admin", "layout");
    let msg = "Product saved. The shop pages are being refreshed.";
    if (backInStock.length) msg += ` Back in stock: ${backInStock.join(", ")}. If customers are waiting, use the "Notify" buttons below.`;
    return ok(msg);
  });
}

const notifySchema = z.object({
  productId: idField,
  variationId: z
    .string()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null)),
});

export async function notifyWaitlistAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(notifySchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    const res = await notifyWaitlist(parsed.data.productId, parsed.data.variationId);
    revalidatePath("/admin", "layout");
    if (!res.ok) return fail(res.error);
    if (res.sent === 0) return fail(`No email could be sent (${res.failed} failed). Check the email (SMTP) settings.`);
    return ok(`Back-in-stock email sent to ${res.sent} customer${res.sent === 1 ? "" : "s"}.${res.failed ? ` ${res.failed} could not be sent and stay on the list.` : ""}`);
  });
}
