"use server";
/** Admin store settings (schema.settings key/value rows). */
import { z } from "zod";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { getDb, schema } from "@/lib/db";
import type { StoreSettings } from "@/lib/settings";
import { adminAction } from "../auth";
import { formObject, ok, parseForm, rupeesOptional } from "../form";

const text = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`));

const thresholdSchema = z.object({ free_shipping_threshold_paise: rupeesOptional("Free shipping threshold") });

const settingsSchema = thresholdSchema.extend({
  announcement_free_delivery: text(200, "Announcement"),
  coupon_banner: text(300, "Coupon banner"),
  cookie_notice: text(500, "Cookie notice"),
  estimated_delivery: text(60, "Estimated delivery"),
  order_number_prefix: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{0,6}$/, "Use up to 6 letters (A–Z), e.g. JM.")),
  max_qty_per_line: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Enter a whole number from 1 to 999.")
    .transform(Number)
    .pipe(z.number().min(1, "Enter a whole number from 1 to 999.")),
});

async function saveValues(values: Partial<StoreSettings>) {
  const db = await getDb();
  const now = new Date();
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(schema.settings)
      .values({ key, value: value as unknown, updatedAt: now })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: value as unknown, updatedAt: now } });
  }
  revalidateTag("settings", "max");
  revalidatePath("/admin", "layout");
}

export async function saveSettingsAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(settingsSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    await saveValues(parsed.data);
    return ok("Settings saved. The shop shows the new values within a minute.");
  });
}

/**
 * "Refresh store data": empties the cached catalog, reviews and settings and rebuilds every page.
 * Needed after changes made outside the admin (npm run db:seed, import:woocommerce, direct SQL),
 * which otherwise show up only when the cache expires (up to 1 hour).
 */
export async function refreshStoreDataAction() {
  return adminAction(async () => {
    for (const tag of ["catalog", "reviews", "settings"]) updateTag(tag);
    revalidatePath("/", "layout");
    return ok("Store data refreshed. The shop now shows the latest products, prices, stock and reviews.");
  });
}

export async function saveThresholdAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(thresholdSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    await saveValues(parsed.data);
    return ok("Free-shipping threshold saved.");
  });
}
