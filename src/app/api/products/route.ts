import { getAllProducts, productCard } from "@/lib/catalog";
import { json } from "@/lib/http";

/**
 * GET /api/products/?ids=12,15,20 – product cards for the wishlist and compare pages
 * (those lists live in the browser, so the page asks for product data by id).
 * Returns cards plus a few extra fields for the compare table.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x) && x > 0)
    .slice(0, 100);
  if (!ids.length) return json({ ok: true, products: [] });
  const all = await getAllProducts();
  const products = ids
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      card: productCard(p),
      packs: p.variations.map((v) => ({ variationId: v.id, label: v.valueLabel, pricePaise: v.pricePaise, regularPricePaise: v.regularPricePaise, inStock: v.inStock })),
      attributeName: p.attributeName,
      shortDescription: (p.shortDescriptionHtml || p.descriptionHtml || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300),
      categories: p.categories,
    }));
  return json({ ok: true, products }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
