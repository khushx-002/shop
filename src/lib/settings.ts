/**
 * Store settings saved in the `settings` table (editable in the admin area).
 * Defaults match the old shop.jivo.in.
 */
import { unstable_cache } from "next/cache";
import { getDb, schema } from "@/lib/db";

export type StoreSettings = {
  free_shipping_threshold_paise: number | null;
  announcement_free_delivery: string;
  coupon_banner: string;
  cookie_notice: string;
  estimated_delivery: string;
  order_number_prefix: string;
  /** Max quantity of one pack size in a single order line. */
  max_qty_per_line: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  free_shipping_threshold_paise: 99900,
  announcement_free_delivery: "Free delivery above ₹499 All Over India",
  coupon_banner: "Get Flat 200 Off on shopping above ₹5000/- Use Code – JIVO200",
  cookie_notice: "This website uses cookies to improve your experience. By using this website you agree to our Privacy Policy.",
  estimated_delivery: "1 - 5 days",
  order_number_prefix: "JM",
  max_qty_per_line: 99,
};

/** Reads settings straight from the database (use in checkout and admin). */
export async function readSettings(): Promise<StoreSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as StoreSettings;
}

/** Cached copy for storefront pages. Revalidate with revalidateTag("settings", "max"). */
export const getSettings = unstable_cache(readSettings, ["store-settings"], { tags: ["settings"], revalidate: 3600 });
