/**
 * Live catalog data for the home page (server only).
 *
 * The texts and images come from src/content/home.json (copied from the old site), but prices
 * and stock always come from the catalog, so the home page never shows an old hard-coded price.
 */
import "server-only";
import home from "@/content/home.json";
import { getCategoryProducts, getProductBySlug, getProductsByTag, imageSize, productCard } from "@/lib/catalog";
import { routes } from "@/lib/routes";
import type { ProductCardData, VariationView } from "@/lib/types";

/**
 * Pack size a spotlight card should sell when that pack is in stock.
 * The old site linked the yellow mustard card to its 1 litre pack (?attribute_pa_size=1l).
 * Every other card uses the cheapest pack that is in stock.
 */
const PREFERRED_PACK: Record<string, string> = {
  "jivo-first-pressed-yellow-mustard-oil": "1l",
};

export type SpotlightCard = {
  key: string;
  title: string; // card title from home.json, e.g. "Buy Canola Oil And Premium Tea | Combo"
  href: string; // product page (with the pack pre-selected when one is in stock)
  image: { url: string; alt: string; width: number; height: number };
  stars: number; // star icons shown on the old card
  ratingText: string; // "4.58 | (238)"
  productId: number;
  productName: string;
  /** The pack that "Add to cart" adds. null = nothing in stock (show the waiting list form). */
  pack: { variationId: number; label: string; pricePaise: number; regularPricePaise: number } | null;
};

function pickPack(slug: string, variations: VariationView[]): VariationView | null {
  const inStock = variations.filter((v) => v.inStock);
  const preferred = PREFERRED_PACK[slug];
  const match = preferred ? inStock.find((v) => v.valueSlug === preferred) : undefined;
  if (match) return match;
  return inStock.reduce<VariationView | null>((best, v) => (!best || v.pricePaise < best.pricePaise ? v : best), null);
}

/** The 4 "In The Spotlight" cards. Cards whose product no longer exists are left out. */
export async function getSpotlightCards(): Promise<SpotlightCard[]> {
  const rows = await Promise.all(
    home.spotlight.items.map(async (item) => {
      const product = await getProductBySlug(item.productSlug);
      if (!product) return null;
      const pack = pickPack(product.slug, product.variations);
      const size = imageSize(item.image) ?? { width: 1024, height: 1024 };
      const card: SpotlightCard = {
        key: product.slug,
        title: item.title,
        href: pack ? routes.product(product.slug, { slug: pack.attributeSlug, value: pack.valueSlug }) : routes.product(product.slug),
        image: { url: item.image, alt: product.name, ...size },
        stars: item.stars,
        ratingText: item.ratingText,
        productId: product.id,
        productName: product.name,
        pack: pack ? { variationId: pack.id, label: pack.valueLabel, pricePaise: pack.pricePaise, regularPricePaise: pack.regularPricePaise } : null,
      };
      return card;
    }),
  );
  return rows.filter((c): c is SpotlightCard => c !== null);
}

/**
 * "Deals Of The Week" carousel: products tagged "deal-of-the-week" (set in the admin).
 * Falls back to the Special Offers category when no product carries the tag.
 */
export async function getDealCards(): Promise<ProductCardData[]> {
  const tagged = (await getProductsByTag(home.dealsSection.productTag)).filter((p) => p.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  const products = tagged.length ? tagged : await getCategoryProducts("special-offers", 12);
  return products.map((p) => productCard(p));
}
