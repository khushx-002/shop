/**
 * Writes the default shipping zones (the old site's rules, scripts/data/shipping-zones.ts).
 * Used by `npm run db:seed` and `npx tsx scripts/sync-shipping-zones.ts`.
 *
 * Safe by default: only when there are no zones yet, or the zones are still the FIRST seeded guess
 * (2 zones: "Delhi NCR" with prefixes 110/122/201 + an untouched "TO CONFIRM" Rest of India).
 * Zones edited in the admin are kept unless `replace` is true.
 */
import * as schema from "../../src/lib/db/schema";
import { DEFAULT_ZONES } from "../data/shipping-zones";
import type { ScriptDb } from "./connect";

const paise = (r: number) => Math.round(r * 100);

export async function applyDefaultZones(db: ScriptDb, opts: { replace?: boolean } = {}): Promise<"set" | "replaced" | "current" | "kept"> {
  const zones = await db.query.shippingZones.findMany();
  const isCurrent = zones.length === DEFAULT_ZONES.length && DEFAULT_ZONES.every((d) => zones.some((z) => z.name === d.name));
  if (isCurrent && !opts.replace) return "current";
  const firstGuess =
    zones.length === 2 &&
    zones.some((z) => z.name === "Delhi NCR" && z.pincodePrefixes.join(",") === "110,122,201") &&
    zones.some((z) => z.isRestOfCountry && (z.note ?? "").startsWith("TO CONFIRM: the old site had no rate"));
  if (zones.length && !firstGuess && !opts.replace) return "kept";
  if (zones.length) await db.delete(schema.shippingZones); // rates go with them (on delete cascade)
  for (const { rates, ...zone } of DEFAULT_ZONES) {
    const [row] = await db.insert(schema.shippingZones).values(zone).returning();
    await db.insert(schema.shippingRates).values(
      rates.map((r) => ({ zoneId: row.id, type: r.type, label: r.label, costPaise: paise(r.costRupees), minOrderPaise: r.minOrderRupees == null ? null : paise(r.minOrderRupees), sortOrder: r.sortOrder })),
    );
  }
  return zones.length ? "replaced" : "set";
}
