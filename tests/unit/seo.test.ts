import { describe, expect, it } from "vitest";
import { absoluteUrl, breadcrumbJsonLd, productJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/site";
import type { ProductDetail, VariationView } from "@/lib/types";

const BASE = SITE.url.replace(/\/$/, "");

function variation(over: Partial<VariationView>): VariationView {
  return {
    id: 1,
    legacyId: null,
    sku: null,
    attributeSlug: "pa_capacity",
    valueSlug: "1-litre",
    valueLabel: "1 Litre",
    title: null,
    swatchImage: null,
    image: null,
    pricePaise: 18900,
    regularPricePaise: 28500,
    inStock: true,
    manageStock: false,
    stockQty: null,
    isDefault: false,
    sortOrder: 0,
    shopOrder: 0,
    ...over,
  };
}

function product(over: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 7,
    legacyId: 21211,
    slug: "jivo-rice-bran-oil",
    name: "Jivo Rice Bran Oil",
    template: "rich",
    visible: true,
    featured: false,
    brand: { slug: "jivo", name: "Jivo" },
    categories: [{ slug: "super-oils", name: "Super Oils" }],
    tags: [],
    images: [{ url: "/images/products/rice-bran.jpg", alt: "Jivo Rice Bran Oil", width: 800, height: 800 }],
    variations: [
      variation({ id: 1, sku: "SJSORB-1L", valueSlug: "1-litre", valueLabel: "1 Litre", pricePaise: 18900 }),
      variation({ id: 2, sku: null, valueSlug: "5l", valueLabel: "5 Litre", pricePaise: 94900, inStock: false }),
    ],
    ratingAvg: 4.58,
    ratingCount: 238,
    ratingText: "238",
    unitsSoldText: null,
    tagline: null,
    estimatedDelivery: null,
    attributeName: "Capacity",
    inStock: true,
    onSale: true,
    minPricePaise: 18900,
    minRegularPricePaise: 28500,
    sortOrder: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    shortDescriptionHtml: "<p>Heart  <strong>healthy</strong> oil.</p>",
    descriptionHtml: null,
    disclaimerHtml: null,
    additionalInfo: [],
    content: {},
    seoTitle: null,
    seoDescription: null,
    ...over,
  };
}

describe("absoluteUrl", () => {
  it("prefixes site paths and keeps absolute URLs", () => {
    expect(absoluteUrl("/shop/")).toBe(`${BASE}/shop/`);
    expect(absoluteUrl("shop/")).toBe(`${BASE}/shop/`);
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});

describe("productJsonLd", () => {
  it("builds a Product with an AggregateOffer for several pack sizes", () => {
    const data = productJsonLd(product()) as Record<string, unknown>;
    expect(data["@type"]).toBe("Product");
    expect(data.url).toBe(`${BASE}/product/jivo-rice-bran-oil/`);
    expect(data.description).toBe("Heart healthy oil."); // HTML stripped, spaces collapsed
    expect(data.brand).toEqual({ "@type": "Brand", name: "Jivo" });
    const offers = data.offers as { "@type": string; lowPrice: string; highPrice: string; offerCount: number; offers: Record<string, string>[] };
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.lowPrice).toBe("189.00");
    expect(offers.highPrice).toBe("949.00");
    expect(offers.offerCount).toBe(2);
    expect(offers.offers[0]).toMatchObject({
      "@type": "Offer",
      price: "189.00",
      priceCurrency: "INR",
      sku: "SJSORB-1L",
      availability: "https://schema.org/InStock",
      url: `${BASE}/product/jivo-rice-bran-oil/?attribute_pa_capacity=1-litre`,
    });
    // out-of-stock pack + generated SKU when the pack has none
    expect(offers.offers[1]).toMatchObject({ availability: "https://schema.org/OutOfStock", sku: "21211-5l", price: "949.00" });
  });

  it("uses a single Offer when there is one pack size", () => {
    const data = productJsonLd(product({ variations: [variation({ pricePaise: 26900 })] })) as { offers: Record<string, string> };
    expect(data.offers["@type"]).toBe("Offer");
    expect(data.offers.price).toBe("269.00");
  });

  it("skips packs with no price and leaves offers out when nothing has a price", () => {
    const data = productJsonLd(product({ variations: [variation({ pricePaise: 0 })] })) as Record<string, unknown>;
    expect(data.offers).toBeUndefined();
  });

  it("adds aggregateRating only when the product has ratings", () => {
    const rated = productJsonLd(product()) as Record<string, unknown>;
    expect(rated.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: "4.58", reviewCount: 238, bestRating: "5", worstRating: "1" });
    const unrated = productJsonLd(product({ ratingAvg: 0, ratingCount: 0 })) as Record<string, unknown>;
    expect(unrated.aggregateRating).toBeUndefined();
  });

  it("adds up to 5 reviews", () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({ id: i, authorName: `Customer ${i}`, rating: 5, body: "Great oil", verified: true, createdAt: "2026-05-04T10:00:00.000Z" }));
    const data = productJsonLd(product(), reviews) as { review: Record<string, unknown>[] };
    expect(data.review).toHaveLength(5);
    expect(data.review[0]).toMatchObject({ "@type": "Review", author: { "@type": "Person", name: "Customer 0" }, datePublished: "2026-05-04" });
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the items and makes paths absolute; the last item may have no link", () => {
    const data = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Super Oils", path: "/product-category/super-oils/" }, { name: "Jivo Rice Bran Oil" }]);
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Super Oils", item: `${BASE}/product-category/super-oils/` },
      { "@type": "ListItem", position: 3, name: "Jivo Rice Bran Oil" },
    ]);
  });
});
