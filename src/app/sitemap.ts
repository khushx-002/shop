/**
 * /sitemap.xml – a clean sitemap (the old WordPress one was full of spam URLs).
 *
 * Built at REQUEST time, never at build/prerender time: Next.js prerenders in separate worker
 * processes, and the local PGlite database can only be opened by one process (the server).
 * The data is small (a few dozen rows), so building it per request is cheap.
 *
 * Every URL is absolute and ends with "/" (trailingSlash: true, same as the old site).
 */
import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getAllProducts } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Pages from the pages table that have their own route folder, or live at /<slug>/ via [slug]. */
function pagePath(slug: string): string {
  return slug === "about-us" ? routes.about : routes.post(slug);
}

/** Latest of a list of dates (or undefined when the list is empty). */
function latest(dates: (Date | undefined)[]): Date | undefined {
  const ms = dates.filter((d): d is Date => !!d).map((d) => d.getTime());
  return ms.length ? new Date(Math.max(...ms)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [products, productDates, pages, posts] = await Promise.all([
    getAllProducts(), // published products only (status = "publish"), incl. hidden and out-of-stock ones
    db.select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt }).from(schema.products).where(eq(schema.products.status, "publish")),
    db.select({ slug: schema.pages.slug, updatedAt: schema.pages.updatedAt }).from(schema.pages),
    db.select({ slug: schema.posts.slug, updatedAt: schema.posts.updatedAt }).from(schema.posts),
  ]);

  const productUpdated = new Map(productDates.map((p) => [p.slug, p.updatedAt]));
  const productLastMod = latest([...productUpdated.values()]);

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl(routes.home), lastModified: productLastMod, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl(routes.shop), lastModified: productLastMod, changeFrequency: "daily", priority: 0.9 },
  ];

  // Categories that contain at least one published product (out-of-stock products count: their pages are real).
  const categories = new Map<string, Date | undefined>();
  for (const p of products) {
    for (const c of p.categories) categories.set(c.slug, latest([categories.get(c.slug), productUpdated.get(p.slug)]));
  }
  for (const [slug, lastModified] of categories) {
    entries.push({ url: absoluteUrl(routes.category(slug)), lastModified, changeFrequency: "weekly", priority: 0.8 });
  }

  for (const p of products) {
    entries.push({ url: absoluteUrl(routes.product(p.slug)), lastModified: productUpdated.get(p.slug), changeFrequency: "weekly", priority: p.inStock ? 0.8 : 0.5 });
  }

  for (const page of pages) {
    entries.push({ url: absoluteUrl(pagePath(page.slug)), lastModified: page.updatedAt, changeFrequency: "yearly", priority: 0.3 });
  }

  entries.push(
    { url: absoluteUrl(routes.faq), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl(routes.contact), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl(routes.blogs), lastModified: latest(posts.map((p) => p.updatedAt)), changeFrequency: "weekly", priority: 0.5 },
  );
  for (const post of posts) {
    entries.push({ url: absoluteUrl(routes.post(post.slug)), lastModified: post.updatedAt, changeFrequency: "monthly", priority: 0.5 });
  }
  entries.push({ url: absoluteUrl(routes.trackOrder), changeFrequency: "yearly", priority: 0.2 });

  // Safety net: never list the same URL twice (e.g. a page slug that is also a fixed route).
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
