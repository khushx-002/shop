"use server";
/** Admin coupon actions: create, update, delete. */
import { z } from "zod";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { adminAction } from "../auth";
import { checkbox, fail, formObject, idField, ok, optionalInt, optionalText, parseForm, rupeesOptional } from "../form";

const couponSchema = z
  .object({
    id: z
      .string()
      .optional()
      .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null)),
    code: z
      .string({ error: "Code is required." })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,40}$/, "Use 2–40 letters, numbers, - or _ (no spaces)."),
    type: z.enum(["fixed_cart", "percent", "free_shipping"], { error: "Choose a discount type." }),
    amount: z
      .string()
      .optional()
      .transform((v) => (v ?? "").replace(/[₹,%\s]/g, "")),
    minSpend: rupeesOptional("Minimum spend"),
    maxSpend: rupeesOptional("Maximum spend"),
    expiresAt: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim())
      .pipe(z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")]))
      // The coupon works until the end of that day, Indian time.
      .transform((v) => (v ? new Date(`${v}T23:59:59.999+05:30`) : null)),
    usageLimit: optionalInt("Usage limit", 1),
    perUserLimit: optionalInt("Limit per customer", 1),
    active: checkbox,
    description: optionalText(200, "Description"),
  })
  .transform((d, ctx) => {
    let amount = 0;
    if (d.type === "fixed_cart") {
      if (!/^\d{1,8}(\.\d{1,2})?$/.test(d.amount) || Number(d.amount) <= 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter the discount in rupees, e.g. 200." });
      else amount = Math.round(Number(d.amount) * 100);
    } else if (d.type === "percent") {
      if (!/^\d{1,3}$/.test(d.amount) || Number(d.amount) < 1 || Number(d.amount) > 100) ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter a whole percent from 1 to 100." });
      else amount = Number(d.amount);
    }
    if (d.minSpend != null && d.maxSpend != null && d.maxSpend < d.minSpend) {
      ctx.addIssue({ code: "custom", path: ["maxSpend"], message: "Maximum spend must be higher than the minimum spend." });
    }
    return { ...d, amount };
  });

export async function saveCouponAction(_prev: unknown, formData: FormData) {
  const result = await adminAction(async () => {
    const parsed = parseForm(couponSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    const { id, ...values } = parsed.data;
    const db = await getDb();
    const clash = await db.query.coupons.findFirst({
      where: and(sql`upper(${schema.coupons.code}) = ${values.code}`, id ? ne(schema.coupons.id, id) : undefined),
      columns: { id: true },
    });
    if (clash) return fail("Please fix the highlighted fields.", { code: "Another coupon already uses this code." });
    if (id) {
      const [row] = await db.update(schema.coupons).set({ ...values, updatedAt: new Date() }).where(eq(schema.coupons.id, id)).returning({ id: schema.coupons.id });
      if (!row) return fail("This coupon no longer exists.");
      revalidatePath("/admin", "layout");
      return ok(`Coupon ${values.code} saved.`);
    }
    await db.insert(schema.coupons).values(values);
    revalidatePath("/admin", "layout");
    return ok(`created:${values.code}`);
  });
  // A new coupon goes back to the list (redirect must be outside the try/catch wrapper).
  if (result?.ok && result.message?.startsWith("created:")) redirect(`/admin/coupons/?created=${encodeURIComponent(result.message.slice(8))}`);
  return result;
}

export async function deleteCouponAction(_prev: unknown, formData: FormData) {
  const result = await adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.delete(schema.coupons).where(eq(schema.coupons.id, parsed.data.id)).returning({ code: schema.coupons.code });
    if (!row) return fail("This coupon no longer exists.");
    revalidatePath("/admin", "layout");
    return ok(`deleted:${row.code}`);
  });
  if (result?.ok && result.message?.startsWith("deleted:")) redirect(`/admin/coupons/?deleted=${encodeURIComponent(result.message.slice(8))}`);
  return result;
}
