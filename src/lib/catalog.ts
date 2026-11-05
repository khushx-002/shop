/**
 * Catalog data for the storefront (server only).
 *
 * The catalog is small (about 30 products), so we load one "snapshot" of all published
 * products with their variations, images and categories, cache it, and filter/sort in memory.
 * This is faster than many small queries. Cart and checkout never use this cache: they read
 * live prices and stock from the database.
 *
 * Cache: tag "catalog". After changing products/prices/stock call:
 *   revalidateTag("catalog", "max")  (Next 16 needs the second argument)  and revalidatePath(...) for pages.
 */
import { unstable_cache } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type {
  CategoryRef,
  CategoryView,
  ImageView,
  ListingQuery,
  ListingResult,
  PageView,
  PostView,
  ProductCardData,
  ProductDetail,
  ProductSummary,
  ReviewSummary,
  ReviewView,
  SearchSuggestion,
  SortKey,
  VariationView,
} from "@/lib/types";
import { routes } from "@/lib/routes";
import imageSizes from "@/content/image-sizes.json";

const SIZES = imageSizes as unknown as Record<string, [number, number]>;

/** Width/height for a local image path (from src/content/image-sizes.json), when known. */
export function imageSize(url: string | null | undefined): { width: number; height: number } | null {
  if (!url) return null;
  const s = SIZES[url];
  return s ? { width: s[0], height: s[1] } : null;
}

function toImage(url: string, alt: string, width?: number | null, height?: number | null): ImageView {
  const s = imageSize(url);
  return { url, alt, width: width ?? s?.width ?? null, height: height ?? s?.height ?? null };
}

/* ------------------------------------------------------------------ snapshot */

type Snapshot = { products: ProductDetail[]; categories: CategoryView[] };

async function loadSnapshot(): Promise<Snapshot> {
  const db = await getDb();
  const rows = await db.query.products.findMany({
    where: eq(schema.products.status, "publish"),
    with: {
      images: true,
      variations: true,
      productCategories: { with: { category: true } },
      tags: true,
      brand: true,
      content: true,
    },
  });
  const cats = await db.select().from(schema.categories);

  const products: ProductDetail[] = rows.map((p) => {
    const variations: VariationView[] = [...p.variations]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .map((v) => ({
        id: v.id,
        legacyId: v.legacyId,
        sku: v.sku,
        attributeSlug: v.attributeSlug,
        valueSlug: v.valueSlug,
        valueLabel: v.valueLabel,
        title: v.title,
        swatchImage: v.swatchImage,
        image: v.image,
        pricePaise: v.pricePaise,
        regularPricePaise: v.regularPricePaise,
        inStock: v.inStock && (!v.manageStock || (v.stockQty ?? 0) > 0),
        manageStock: v.manageStock,
        stockQty: v.stockQty,
        isDefault: v.isDefault,
        sortOrder: v.sortOrder,
        shopOrder: v.shopOrder,
      }));
    const sellable = variations.filter((v) => v.inStock);
    const cheapest = sellable.reduce<VariationView | null>((m, v) => (!m || v.pricePaise < m.pricePaise ? v : m), null);
    const categories: CategoryRef[] = p.productCategories
      .map((pc) => pc.category)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ slug: c.slug, name: c.name }));
    return {
      id: p.id,
      legacyId: p.legacyId,
      slug: p.slug,
      name: p.name,
      template: p.template,
      visible: p.visible,
      featured: p.featured,
      brand: p.brand ? { slug: p.brand.slug, name: p.brand.name } : null,
      categories,
      tags: p.tags.map((t) => t.tag),
      images: [...p.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => toImage(i.url, i.alt || p.name, i.width, i.height)),
      variations,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      ratingText: p.ratingText,
      unitsSoldText: p.unitsSoldText,
      tagline: p.tagline,
      estimatedDelivery: p.estimatedDelivery,
      attributeName: p.attributeName,
      inStock: sellable.length > 0,
      onSale: sellable.some((v) => v.pricePaise < v.regularPricePaise),
      minPricePaise: cheapest?.pricePaise ?? null,
      minRegularPricePaise: cheapest?.regularPricePaise ?? null,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
      shortDescriptionHtml: p.shortDescriptionHtml,
      descriptionHtml: p.descriptionHtml,
      disclaimerHtml: p.disclaimerHtml,
      additionalInfo: p.additionalInfo,
      content: p.content?.data ?? {},
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
    };
  });

  const categories: CategoryView[] = [...cats]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      image: c.image,
      productCount: products.filter((p) => p.visible && p.inStock && p.categories.some((pc) => pc.slug === c.slug)).length,
    }));
  return { products, categories };
}

const getSnapshot = unstable_cache(loadSnapshot, ["catalog-snapshot-v1"], { tags: ["catalog"], revalidate: 3600 });

/* ------------------------------------------------------------------ products */

export async function getAllProducts(): Promise<ProductDetail[]> {
  return (await getSnapshot()).products;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  return (await getSnapshot()).products.find((p) => p.slug === slug) ?? null;
}

export async function getProductsBySlugs(slugs: string[]): Promise<ProductDetail[]> {
  const all = await getAllProducts();
  return slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is ProductDetail => !!p);
}

/** Visible, in-stock products in a category (for carousels), in default order. */
export async function getCategoryProducts(categorySlug: string, limit = 12): Promise<ProductDetail[]> {
  const all = await getAllProducts();
  return all
    .filter((p) => p.visible && p.inStock && p.categories.some((c) => c.slug === categorySlug))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit);
}

export async function getProductsByTag(tag: string): Promise<ProductDetail[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.tags.includes(tag));
}

export async function getFeaturedProducts(): Promise<ProductDetail[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.featured);
}

/** Picks the variation selected by ?attribute_pa_capacity=... (or the default/first in-stock one). */
export function selectVariation(product: ProductSummary, searchParams?: Record<string, string | string[] | undefined>): VariationView | null {
  if (searchParams) {
    for (const v of product.variations) {
      const raw = searchParams[`attribute_${v.attributeSlug}`];
      const val = Array.isArray(raw) ? raw[0] : raw;
      if (val && val === v.valueSlug) return v;
    }
  }
  return product.variations.find((v) => v.inStock && v.isDefault) ?? product.variations.find((v) => v.inStock) ?? product.variations[0] ?? null;
}

/* ------------------------------------------------------------------ cards */

export function variationCard(p: ProductSummary, v: VariationView): ProductCardData {
  const image = v.image ? toImage(v.image, `${p.name} ${v.valueLabel}`) : p.images[0] ?? null;
  const hover = p.images.find((i) => i.url !== image?.url)?.url ?? null;
  return {
    key: `v-${v.id}`,
    kind: "variation",
    productId: p.id,
    variationId: v.id,
    slug: p.slug,
    href: routes.product(p.slug, { slug: v.attributeSlug, value: v.valueSlug }),
    name: p.name,
    variationTitle: v.title,
    variationLabel: v.valueLabel,
    image,
    hoverImage: hover,
    pricePaise: v.pricePaise,
    regularPricePaise: v.regularPricePaise,
    inStock: v.inStock,
    onSale: v.pricePaise < v.regularPricePaise,
    category: p.categories[0] ?? null,
    categories: p.categories,
    brand: p.brand,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    variationCount: p.variations.length,
  };
}

export function productCard(p: ProductSummary): ProductCardData {
  const v = p.variations.find((x) => x.inStock && x.pricePaise === p.minPricePaise) ?? null;
  const image = p.images[0] ?? (v?.image ? toImage(v.image, p.name) : null);
  return {
    key: `p-${p.id}`,
    kind: "product",
    productId: p.id,
    variationId: p.variations.length === 1 && p.variations[0].inStock ? p.variations[0].id : null,
    slug: p.slug,
    href: routes.product(p.slug),
    name: p.name,
    variationTitle: null,
    variationLabel: null,
    image,
    hoverImage: p.images[1]?.url ?? null,
    pricePaise: p.minPricePaise,
    regularPricePaise: p.minRegularPricePaise,
    inStock: p.inStock,
    onSale: p.onSale,
    category: p.categories[0] ?? null,
    categories: p.categories,
    brand: p.brand,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    variationCount: p.variations.length,
  };
}

/* ------------------------------------------------------------------ listing (shop, category, search) */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchText(p: ProductDetail, v: VariationView): string {
  const html = `${p.shortDescriptionHtml ?? ""} ${p.descriptionHtml ?? ""}`.replace(/<[^>]+>/g, " ");
  return normalize(`${p.name} ${v.valueLabel} ${v.title ?? ""} ${p.categories.map((c) => c.name).join(" ")} ${p.tags.join(" ")} ${p.brand?.name ?? ""} ${html}`);
}

function matchesQuery(p: ProductDetail, v: VariationView, q: string): boolean {
  const words = normalize(q).split(" ").filter(Boolean);
  if (!words.length) return false; // e.g. "!!!" or non-Latin text: no match instead of "everything"
  const hay = searchText(p, v);
  const title = normalize(`${p.name} ${v.valueLabel}`);
  // every word must appear somewhere; at least one must appear in the title (keeps results relevant)
  return words.every((w) => hay.includes(w)) && words.some((w) => title.includes(w));
}

/**
 * The shop grid lists one card per pack size (variation), like the old site.
 * Only visible products and in-stock packs are listed ("hide out of stock items" was on).
 */
export async function listShopCards(query: ListingQuery = {}): Promise<ListingResult> {
  const { products, categories } = await getSnapshot();
  const sort: SortKey = query.sort ?? "menu_order";
  const perPage = query.perPage ?? 12;
  const status = query.status ?? [];
  const showOutOfStock = status.includes("outofstock");

  type Row = { p: ProductDetail; v: VariationView };
  let rows: Row[] = [];
  for (const p of products) {
    if (!p.visible) continue;
    for (const v of p.variations) {
      if (!v.inStock && !showOutOfStock) continue;
      rows.push({ p, v });
    }
  }
  if (query.category) rows = rows.filter((r) => r.p.categories.some((c) => c.slug === query.category));
  if (query.brand) rows = rows.filter((r) => r.p.brand?.slug === query.brand);
  if (query.q && query.q.trim()) rows = rows.filter((r) => matchesQuery(r.p, r.v, query.q!));

  // counts per category for the sidebar (before price/status filters)
  const categoryCounts = categories
    .map((c) => ({ slug: c.slug, name: c.name, count: rows.filter((r) => r.p.categories.some((pc) => pc.slug === c.slug)).length }))
    .filter((c) => c.count > 0);

  const prices = rows.map((r) => r.v.pricePaise);
  const priceBounds = { minPaise: prices.length ? Math.min(...prices) : 0, maxPaise: prices.length ? Math.max(...prices) : 0 };

  if (query.minPricePaise != null) rows = rows.filter((r) => r.v.pricePaise >= query.minPricePaise!);
  if (query.maxPricePaise != null) rows = rows.filter((r) => r.v.pricePaise <= query.maxPricePaise!);
  if (status.length) {
    rows = rows.filter(
      (r) =>
        (status.includes("instock") && r.v.inStock) ||
        (status.includes("outofstock") && !r.v.inStock) ||
        (status.includes("onsale") && r.v.pricePaise < r.v.regularPricePaise),
    );
  }

  const byDefault = (a: Row, b: Row) => a.v.shopOrder - b.v.shopOrder || a.p.sortOrder - b.p.sortOrder || a.v.sortOrder - b.v.sortOrder;
  const sorters: Record<SortKey, (a: Row, b: Row) => number> = {
    menu_order: byDefault,
    popularity: (a, b) => b.p.ratingCount - a.p.ratingCount || byDefault(a, b),
    rating: (a, b) => b.p.ratingAvg - a.p.ratingAvg || byDefault(a, b),
    date: (a, b) => b.p.createdAt.localeCompare(a.p.createdAt) || byDefault(a, b),
    price: (a, b) => a.v.pricePaise - b.v.pricePaise || byDefault(a, b),
    "price-desc": (a, b) => b.v.pricePaise - a.v.pricePaise || byDefault(a, b),
  };
  rows.sort(Object.hasOwn(sorters, sort) ? sorters[sort] : byDefault);

  const total = rows.length;
  const size = perPage === -1 ? Math.max(total, 1) : Math.max(1, perPage);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const requested = Number.isFinite(query.page) ? Math.floor(query.page!) : 1;
  const page = Math.min(Math.max(1, requested), totalPages);
  const slice = rows.slice((page - 1) * size, page * size);
  return {
    cards: slice.map((r) => variationCard(r.p, r.v)),
    total,
    page,
    perPage: perPage === -1 ? -1 : size,
    totalPages,
    priceBounds,
    categoryCounts,
  };
}

/** Suggestions for the header search popup (max 8). */
export async function searchSuggestions(q: string, categorySlug?: string | null): Promise<SearchSuggestion[]> {
  if (!q.trim()) return [];
  const res = await listShopCards({ q, category: categorySlug || null, perPage: 40 });
  const seen = new Set<number>();
  const out: SearchSuggestion[] = [];
  for (const c of res.cards) {
    if (seen.has(c.productId)) continue;
    seen.add(c.productId);
    out.push({ name: c.name, href: routes.product(c.slug), image: c.image?.url ?? null, pricePaise: c.pricePaise, regularPricePaise: c.regularPricePaise, category: c.category?.name ?? null });
    if (out.length >= 8) break;
  }
  return out;
}

/* ------------------------------------------------------------------ categories */

export async function getCategories(): Promise<CategoryView[]> {
  return (await getSnapshot()).categories;
}

export async function getCategory(slug: string): Promise<CategoryView | null> {
  return (await getSnapshot()).categories.find((c) => c.slug === slug) ?? null;
}

/* ------------------------------------------------------------------ reviews */

async function loadReviews(productId: number): Promise<{ reviews: ReviewView[]; summary: ReviewSummary }> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.reviews)
    .where(and(eq(schema.reviews.productId, productId), eq(schema.reviews.status, "approved")))
    .orderBy(desc(schema.reviews.createdAt), desc(schema.reviews.id));
  const histogram: ReviewSummary["histogram"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) histogram[Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5]++;
  const average = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  return {
    reviews: rows.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, body: r.body, verified: r.verified, createdAt: r.createdAt.toISOString() })),
    summary: { average: Math.round(average * 10) / 10, count: rows.length, histogram },
  };
}

/** Approved reviews for a product, newest first. Cache tag: "reviews". */
export const getProductReviews = unstable_cache(loadReviews, ["product-reviews-v1"], { tags: ["reviews"], revalidate: 3600 });

/* ------------------------------------------------------------------ content pages & posts */

export const getPage = unstable_cache(
  async (slug: string): Promise<PageView | null> => {
    const db = await getDb();
    const row = await db.query.pages.findFirst({ where: eq(schema.pages.slug, slug) });
    return row ? { slug: row.slug, title: row.title, bodyHtml: row.bodyHtml, seoTitle: row.seoTitle, seoDescription: row.seoDescription, updatedAt: row.updatedAt.toISOString() } : null;
  },
  ["page-v1"],
  { tags: ["pages"], revalidate: 3600 },
);

export const getPosts = unstable_cache(
  async (): Promise<PostView[]> => {
    const db = await getDb();
    const rows = await db.select().from(schema.posts).orderBy(desc(schema.posts.publishedAt));
    return rows.map((r) => ({ slug: r.slug, title: r.title, excerpt: r.excerpt, bodyHtml: r.bodyHtml, coverImage: r.coverImage, category: r.category, publishedAt: r.publishedAt.toISOString() }));
  },
  ["posts-v1"],
  { tags: ["posts"], revalidate: 3600 },
);

export async function getPost(slug: string): Promise<PostView | null> {
  return (await getPosts()).find((p) => p.slug === slug) ?? null;
}
