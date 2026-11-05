/**
 * Server-side data for the listing pages (shop, category, search, "Load More").
 * Everything comes from the cached catalog snapshot in src/lib/catalog.ts.
 */
import "server-only";
import { getAllProducts, listShopCards } from "@/lib/catalog";
import type { ListingQuery, ListingResult } from "@/lib/types";

/** Short plain-text description per product id (for the list view), max ~220 characters. */
export type Descriptions = Record<number, string>;

/** HTML -> plain text (tags removed, common entities decoded). Also used for the category text in the page hero. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text: string, max = 220): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 120 ? cut.lastIndexOf(" ") : max)}…`;
}

export async function getListing(query: ListingQuery, withDescriptions: boolean): Promise<{ result: ListingResult; descriptions: Descriptions }> {
  const result = await listShopCards(query);
  const descriptions: Descriptions = {};
  if (withDescriptions && result.cards.length) {
    const ids = new Set(result.cards.map((c) => c.productId));
    for (const p of await getAllProducts()) {
      if (!ids.has(p.id)) continue;
      const text = plainText(p.shortDescriptionHtml || p.descriptionHtml || "");
      if (text) descriptions[p.id] = shorten(text);
    }
  }
  return { result, descriptions };
}
