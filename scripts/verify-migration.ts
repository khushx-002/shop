/**
 * Checks that the database matches the catalog captured from the old shop (src/content/products.json)
 * and, with --live, the public WooCommerce Store API of shop.jivo.in. READ-ONLY: it never writes.
 *
 *   npx tsx scripts/verify-migration.ts            # database vs products.json + images on disk
 *   npx tsx scripts/verify-migration.ts --live     # also compare prices/stock with https://shop.jivo.in (GET only)
 *   npx tsx scripts/verify-migration.ts --verbose  # list every passing check too
 *
 * Prints a PASS/FAIL table and exits with code 1 when something fails.
 * Local PGlite database: stop the dev server first, or set PGLITE_DATA_DIR to a copy of .data/pglite.
 */
import "./lib/env";
import fs from "node:fs";
import path from "node:path";
import { connect } from "./lib/connect";

type SeedVariation = { legacyId: number | null; sku: string | null; valueSlug: string; valueLabel: string; image: string | null; swatchImage: string | null; price: number; regularPrice: number; inStock: boolean };
type SeedProduct = { legacyId: number; slug: string; name: string; visible: boolean; images: { url: string }[]; variations: SeedVariation[] };

const LIVE_API = "https://shop.jivo.in/wp-json/wc/store/v1/products";
const args = new Set(process.argv.slice(2));
const LIVE = args.has("--live");
const VERBOSE = args.has("--verbose");

type Row = { check: string; expected: string; actual: string; result: "PASS" | "FAIL" | "WARN" };
const rows: Row[] = [];
function check(name: string, expected: unknown, actual: unknown, ok = String(expected) === String(actual), warnOnly = false) {
  rows.push({ check: name, expected: String(expected), actual: String(actual), result: ok ? "PASS" : warnOnly ? "WARN" : "FAIL" });
}

const paise = (r: number) => Math.round(r * 100);
const rupees = (p: number | null | undefined) => (p == null ? "-" : `₹${(p / 100).toFixed(2)}`);

/** "/images/products/a%20b.jpg" -> public/images/products/a b.jpg */
function publicFile(url: string): string {
  const clean = decodeURIComponent(url.split("?")[0]);
  return path.join(process.cwd(), "public", ...clean.split("/").filter(Boolean));
}

async function guardPglite() {
  if (process.env.DATABASE_URL) return;
  const dir = process.env.PGLITE_DATA_DIR || "./.data/pglite";
  if (dir === "memory" || path.resolve(dir) !== path.resolve("./.data/pglite")) return;
  for (const port of [3000, 3100]) {
    let up = false;
    try {
      await fetch(`http://localhost:${port}/robots.txt`, { signal: AbortSignal.timeout(1500) });
      up = true;
    } catch {
      /* nothing listening */
    }
    if (up) throw new Error(`A server is running on http://localhost:${port}. PGlite allows one process: stop it, or set PGLITE_DATA_DIR to a copy of .data/pglite.`);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "JivoMart-migration-check/1.0" }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

type StoreProduct = {
  id: number;
  slug: string;
  name: string;
  is_in_stock: boolean;
  prices: { price: string; regular_price: string; currency_minor_unit: number };
  variations?: { id: number; attributes: { name: string; value: string }[] }[];
};

/** Store API price string ("94900" with minor unit 2) -> paise. */
function storePaise(p: StoreProduct["prices"]): { price: number; regular: number } {
  const f = 10 ** (2 - (p.currency_minor_unit ?? 2));
  return { price: Math.round(Number(p.price) * f), regular: Math.round(Number(p.regular_price) * f) };
}

async function main() {
  await guardPglite();
  const seed = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "content", "products.json"), "utf8")) as SeedProduct[];
  const { db, close, kind } = await connect();
  console.log(`Checking the ${kind} database against src/content/products.json${LIVE ? " and the live shop" : ""}...\n`);

  try {
    const products = await db.query.products.findMany({ with: { variations: true, images: true } });
    const seedVariations = seed.reduce((n, p) => n + p.variations.length, 0);
    const dbVariations = products.reduce((n, p) => n + p.variations.length, 0);

    // 1. counts
    check("Product count", seed.length, products.length);
    check("Visible products", seed.filter((p) => p.visible).length, products.filter((p) => p.visible && p.status === "publish").length);
    check("Variation (pack size) count", seedVariations, dbVariations);
    const missing = seed.filter((s) => !products.some((p) => p.slug === s.slug)).map((s) => s.slug);
    const extra = products.filter((p) => !seed.some((s) => s.slug === p.slug)).map((p) => p.slug);
    check("Products missing in database", "none", missing.join(", ") || "none");
    check("Extra products in database (not in products.json)", "none", extra.join(", ") || "none", extra.length === 0, true);

    // 2. every product / pack: price, regular price, stock, legacy id
    let priceFails = 0;
    let stockFails = 0;
    for (const s of seed) {
      const p = products.find((x) => x.slug === s.slug);
      if (!p) continue;
      if (p.legacyId !== s.legacyId) check(`${s.slug}: old WooCommerce id`, s.legacyId, p.legacyId);
      if (p.visible !== s.visible) check(`${s.slug}: visible in shop`, s.visible, p.visible);
      for (const sv of s.variations) {
        const v = p.variations.find((x) => x.valueSlug === sv.valueSlug);
        if (!v) {
          check(`${s.slug} – ${sv.valueLabel}: pack exists`, "yes", "missing");
          continue;
        }
        const label = `${s.slug} – ${sv.valueLabel}`;
        const okPrice = v.pricePaise === paise(sv.price);
        const okRegular = v.regularPricePaise === paise(sv.regularPrice || sv.price);
        if (!okPrice) priceFails++;
        if (!okRegular) priceFails++;
        if (!okPrice || VERBOSE) check(`${label}: price`, rupees(paise(sv.price)), rupees(v.pricePaise), okPrice);
        if (!okRegular || VERBOSE) check(`${label}: regular price`, rupees(paise(sv.regularPrice || sv.price)), rupees(v.regularPricePaise), okRegular);
        const inStock = v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0);
        if (inStock !== sv.inStock) stockFails++;
        // stock changes after launch are normal (orders, admin), so a difference is a warning, not a failure
        if (inStock !== sv.inStock || VERBOSE) check(`${label}: in stock`, sv.inStock, inStock, inStock === sv.inStock, true);
      }
    }
    check("All pack prices match products.json", "0 differences", `${priceFails} differences`, priceFails === 0);
    check("All stock flags match products.json", "0 differences", `${stockFails} differences`, stockFails === 0, true);

    // 3. images referenced by the database exist in public/
    const urls = new Set<string>();
    for (const p of products) {
      for (const i of p.images) urls.add(i.url);
      for (const v of p.variations) {
        if (v.image) urls.add(v.image);
        if (v.swatchImage) urls.add(v.swatchImage);
      }
    }
    const remote = [...urls].filter((u) => /^https?:\/\//.test(u));
    const missingFiles = [...urls].filter((u) => !/^https?:\/\//.test(u) && !fs.existsSync(publicFile(u)));
    check("Product images found in public/", `${urls.size - remote.length} files`, `${urls.size - remote.length - missingFiles.length} files`, missingFiles.length === 0);
    for (const m of missingFiles.slice(0, 20)) check(`Image file missing: ${m}`, "exists", "missing", false);
    if (remote.length) check("Images still loaded from another site", 0, remote.length, false, true);
    const noImage = products.filter((p) => p.visible && p.status === "publish" && p.images.length === 0).map((p) => p.slug);
    check("Visible products without images", "none", noImage.join(", ") || "none");

    // 4. live comparison with the old shop (read-only GET requests)
    if (LIVE) {
      console.log(`Fetching ${LIVE_API} ...`);
      let live: StoreProduct[] = [];
      try {
        live = await getJson<StoreProduct[]>(`${LIVE_API}?per_page=100`);
      } catch (err) {
        check("Live Store API reachable", "HTTP 200", err instanceof Error ? err.message : String(err), false);
      }
      if (live.length) {
        const visibleSeed = seed.filter((p) => p.visible);
        check("Live: products listed by the old shop", visibleSeed.length, live.length, live.length === visibleSeed.length, true);
        let liveDiffs = 0;
        for (const s of visibleSeed) {
          const lp = live.find((x) => x.id === s.legacyId || x.slug === s.slug);
          const p = products.find((x) => x.slug === s.slug);
          if (!lp || !p) {
            check(`Live: ${s.slug} listed`, "yes", lp ? "yes" : "no", !!lp, true);
            continue;
          }
          for (const sv of s.variations) {
            const v = p.variations.find((x) => x.valueSlug === sv.valueSlug);
            if (!v || !sv.legacyId) continue;
            let lv: StoreProduct;
            try {
              lv = await getJson<StoreProduct>(`${LIVE_API}/${sv.legacyId}`);
            } catch (err) {
              check(`Live: ${s.slug} – ${sv.valueLabel}`, "HTTP 200", err instanceof Error ? err.message : String(err), false, true);
              continue;
            }
            const lpz = storePaise(lv.prices);
            const label = `Live: ${s.slug} – ${sv.valueLabel}`;
            const okPrice = lpz.price === v.pricePaise;
            const okStock = lv.is_in_stock === (v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0));
            if (!okPrice || !okStock) liveDiffs++;
            if (!okPrice || VERBOSE) check(`${label}: price`, rupees(lpz.price), rupees(v.pricePaise), okPrice);
            if (!okStock || VERBOSE) check(`${label}: in stock`, lv.is_in_stock, v.inStock, okStock, true);
            await new Promise((r) => setTimeout(r, 250)); // be polite to the old server
          }
        }
        check("Live: packs that differ from the old shop", 0, liveDiffs);
      }
    }
  } finally {
    await close();
  }

  console.table(rows);
  const fails = rows.filter((r) => r.result === "FAIL").length;
  const warns = rows.filter((r) => r.result === "WARN").length;
  console.log(`\n${fails ? "FAIL" : "PASS"}: ${rows.length} checks, ${fails} failed, ${warns} warning(s).`);
  if (fails) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Verification could not run: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
