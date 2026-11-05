/**
 * Seeds the database with the real Jivo Mart catalog and content captured from shop.jivo.in.
 * Safe to run more than once: products are matched by slug and updated, child rows refreshed.
 *
 * Usage: npm run db:seed
 */
import "./lib/env";
import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { connect } from "./lib/connect";
import * as schema from "../src/lib/db/schema";
import { PAGES } from "../src/content/pages";
import { hashPassword } from "../src/lib/auth/password";
import { applyDefaultZones } from "./lib/shipping-zones";

const CONTENT = path.join(process.cwd(), "src", "content");
function load<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, name), "utf8")) as T;
}

type SeedVariation = { legacyId: number | null; sku: string | null; attributeSlug: string; valueSlug: string; valueLabel: string; title: string; shopOrder: number; swatchImage: string | null; image: string | null; price: number; regularPrice: number; inStock: boolean };
type SeedProduct = {
  legacyId: number; slug: string; name: string; template: "rich" | "standard"; brand: string; categories: string[]; tags: string[]; visible: boolean; featured: boolean;
  tagline: string | null; shortDescriptionHtml: string | null; descriptionHtml: string | null; disclaimerHtml: string | null; additionalInfo: [string, string][];
  ratingAvg: number; ratingCount: number; ratingText: string | null; unitsSoldText: string | null; estimatedDelivery: string | null; attributeName: string;
  images: { url: string; alt: string }[]; variations: SeedVariation[]; benefits: string[]; statBoxes: string[];
  content: schema.ProductContentData; seoTitle: string; seoDescription: string | null;
};
type SeedCategory = { legacyId: number; slug: string; name: string; description: string; image: string | null; sortOrder: number; showInMenu: boolean };
type SeedReview = { productSlug: string; author: string; date: string | null; rating: number; text: string; verified: boolean };
type SeedPost = { legacyId: number; slug: string; title: string; excerpt: string; bodyHtml: string; coverImage: string; publishedAt: string };

const paise = (r: number) => Math.round(r * 100);
const IMAGE_SIZES = load<Record<string, [number, number]>>("image-sizes.json");

async function main() {
  const { db, close, kind } = await connect();
  console.log(`Seeding ${kind} database...`);

  /* brands */
  for (const b of [{ slug: "jivo", name: "Jivo" }, { slug: "sano", name: "Sano" }]) {
    await db.insert(schema.brands).values(b).onConflictDoNothing();
  }
  const brandRows = await db.select().from(schema.brands);
  const brandId = (slug: string) => brandRows.find((b) => b.slug === slug)?.id ?? null;

  /* categories */
  for (const c of load<SeedCategory[]>("categories.json")) {
    await db
      .insert(schema.categories)
      .values({ slug: c.slug, name: c.name, description: c.description, image: c.image, sortOrder: c.sortOrder, showInMenu: c.showInMenu, legacyId: c.legacyId })
      .onConflictDoUpdate({ target: schema.categories.slug, set: { name: c.name, description: c.description, image: c.image, sortOrder: c.sortOrder, showInMenu: c.showInMenu } });
  }
  const catRows = await db.select().from(schema.categories);
  const catId = (slug: string) => catRows.find((c) => c.slug === slug)?.id;

  /* products */
  const products = load<SeedProduct[]>("products.json");
  let sort = 0;
  for (const p of products) {
    sort += 10;
    const values = {
      legacyId: p.legacyId,
      slug: p.slug,
      name: p.name,
      template: p.template,
      status: "publish" as const,
      visible: p.visible,
      featured: p.featured,
      brandId: brandId(p.brand),
      tagline: p.tagline,
      shortDescriptionHtml: p.shortDescriptionHtml,
      descriptionHtml: p.descriptionHtml,
      disclaimerHtml: p.disclaimerHtml,
      additionalInfo: p.additionalInfo,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      ratingText: p.ratingText,
      unitsSoldText: p.unitsSoldText,
      estimatedDelivery: p.estimatedDelivery,
      attributeName: p.attributeName,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      sortOrder: sort,
      updatedAt: new Date(),
    };
    const existing = await db.query.products.findFirst({ where: eq(schema.products.slug, p.slug) });
    let productId: number;
    if (existing) {
      await db.update(schema.products).set(values).where(eq(schema.products.id, existing.id));
      productId = existing.id;
    } else {
      const [row] = await db.insert(schema.products).values(values).returning({ id: schema.products.id });
      productId = row.id;
    }
    // categories & tags
    await db.delete(schema.productCategories).where(eq(schema.productCategories.productId, productId));
    for (const c of p.categories) {
      const id = catId(c);
      if (id) await db.insert(schema.productCategories).values({ productId, categoryId: id }).onConflictDoNothing();
    }
    await db.delete(schema.productTags).where(eq(schema.productTags.productId, productId));
    for (const t of p.tags) await db.insert(schema.productTags).values({ productId, tag: t }).onConflictDoNothing();
    // images
    await db.delete(schema.productImages).where(eq(schema.productImages.productId, productId));
    let i = 0;
    for (const img of p.images) {
      const size = IMAGE_SIZES[img.url];
      await db.insert(schema.productImages).values({ productId, url: img.url, alt: img.alt, width: size?.[0] ?? null, height: size?.[1] ?? null, sortOrder: i++ });
    }
    // variations (upsert by value slug so carts keep working)
    const existingVars = await db.select().from(schema.variations).where(eq(schema.variations.productId, productId));
    let vi = 0;
    const keep: number[] = [];
    for (const v of p.variations) {
      vi += 10;
      const vals = {
        legacyId: v.legacyId,
        productId,
        sku: v.sku,
        attributeSlug: v.attributeSlug,
        valueSlug: v.valueSlug,
        valueLabel: v.valueLabel,
        title: v.title,
        shopOrder: v.shopOrder,
        swatchImage: v.swatchImage,
        image: v.image,
        pricePaise: paise(v.price),
        regularPricePaise: paise(v.regularPrice || v.price),
        manageStock: false,
        stockQty: null,
        inStock: v.inStock,
        isDefault: vi === 10,
        sortOrder: vi,
        updatedAt: new Date(),
      };
      const found = existingVars.find((e) => e.valueSlug === v.valueSlug);
      if (found) {
        await db.update(schema.variations).set(vals).where(eq(schema.variations.id, found.id));
        keep.push(found.id);
      } else {
        const [row] = await db.insert(schema.variations).values(vals).returning({ id: schema.variations.id });
        keep.push(row.id);
      }
    }
    for (const e of existingVars) if (!keep.includes(e.id)) await db.delete(schema.variations).where(eq(schema.variations.id, e.id));
    // landing content (benefit bullets and stat boxes live with the rest of the page content)
    const data: schema.ProductContentData = { ...p.content, benefits: p.benefits, statBoxes: p.statBoxes };
    await db
      .insert(schema.productContent)
      .values({ productId, data })
      .onConflictDoUpdate({ target: schema.productContent.productId, set: { data } });
  }
  console.log(`Products: ${products.length}`);

  /* reviews (only insert when the product has none yet) */
  const reviews = load<SeedReview[]>("reviews.json");
  let inserted = 0;
  for (const r of reviews) {
    const product = await db.query.products.findFirst({ where: eq(schema.products.slug, r.productSlug) });
    if (!product) continue;
    const dup = await db.query.reviews.findFirst({ where: sql`${schema.reviews.productId} = ${product.id} and ${schema.reviews.authorName} = ${r.author} and ${schema.reviews.body} = ${r.text}` });
    if (dup) continue;
    await db.insert(schema.reviews).values({ productId: product.id, authorName: r.author || "Customer", rating: Math.min(5, Math.max(1, r.rating)), body: r.text || "", verified: r.verified, status: "approved", createdAt: r.date ? new Date(r.date) : new Date() });
    inserted++;
  }
  console.log(`Reviews inserted: ${inserted}`);

  /* pages */
  const legal = load<{ privacyHtml: string }>("legal.json");
  const pages = [...PAGES, { slug: "privacy-policy", title: "Privacy Policy", bodyHtml: legal.privacyHtml, seoDescription: "How Jivo Wellness Pvt. Ltd. collects, uses and protects your personal information." }];
  for (const pg of pages) {
    await db
      .insert(schema.pages)
      .values({ slug: pg.slug, title: pg.title, bodyHtml: pg.bodyHtml.trim(), seoDescription: pg.seoDescription })
      .onConflictDoUpdate({ target: schema.pages.slug, set: { title: pg.title, bodyHtml: pg.bodyHtml.trim(), seoDescription: pg.seoDescription, updatedAt: new Date() } });
  }
  console.log(`Pages: ${pages.length}`);

  /* blog posts */
  const posts = load<SeedPost[]>("posts.json");
  for (const p of posts) {
    await db
      .insert(schema.posts)
      .values({ legacyId: p.legacyId, slug: p.slug, title: p.title, excerpt: p.excerpt, bodyHtml: p.bodyHtml, coverImage: p.coverImage, publishedAt: new Date(p.publishedAt) })
      .onConflictDoUpdate({ target: schema.posts.slug, set: { title: p.title, excerpt: p.excerpt, bodyHtml: p.bodyHtml, coverImage: p.coverImage, updatedAt: new Date() } });
  }
  console.log(`Posts: ${posts.length}`);

  /* coupons (JIVO200 is advertised on the home page; both existed on the old site) */
  for (const c of [
    { code: "JIVO200", type: "fixed_cart" as const, amount: paise(200), minSpendPaise: paise(5000), active: true, description: "Flat ₹200 off on shopping above ₹5000" },
    { code: "JIVO100", type: "fixed_cart" as const, amount: paise(100), minSpendPaise: paise(2500), active: false, description: "Flat ₹100 off (was expired on the old site)" },
  ]) {
    await db.insert(schema.coupons).values(c).onConflictDoNothing();
  }

  /* shipping zones + cash on delivery, as on the live old site (zones edited in the admin are kept) */
  const zonesResult = await applyDefaultZones(db);
  if (zonesResult === "set" || zonesResult === "replaced") console.log(`Shipping zones ${zonesResult === "replaced" ? "replaced with" : "set to"} the old site's rules.`);

  /* settings */
  const settings: Record<string, unknown> = {
    free_shipping_threshold_paise: paise(999),
    announcement_free_delivery: "Free delivery above ₹499 All Over India",
    coupon_banner: "Get Flat 200 Off on shopping above ₹5000/- Use Code – JIVO200",
    cookie_notice: "This website uses cookies to improve your experience. By using this website you agree to our Privacy Policy.",
    estimated_delivery: "1 - 5 days",
    order_number_prefix: "JM",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.insert(schema.settings).values({ key, value: value as object }).onConflictDoNothing();
  }

  /* admin user */
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@jivo.in").toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "ChangeMe-123";
  const admin = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${adminEmail}` });
  if (!admin) {
    await db.insert(schema.users).values({ email: adminEmail, name: "Jivo Admin", role: "admin", passwordHash: await hashPassword(adminPass) });
    console.log(`Admin user created: ${adminEmail}`);
  }

  await close();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
