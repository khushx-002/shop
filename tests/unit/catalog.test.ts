/**
 * listShopCards() against an in-memory PGlite database with the fixture catalog (tests/helpers/fixtures.ts).
 * In stock + visible cards in default order (shopOrder): canola 5l, evoo 1l, canola 1l, sano 1l, sano 5l.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { setupTestDb, type FixtureIds } from "../helpers/fixtures";
import { getProductBySlug, listShopCards, searchSuggestions, selectVariation } from "@/lib/catalog";

let ids: FixtureIds;

beforeAll(async () => {
  ({ ids } = await setupTestDb());
});

const names = (cards: { name: string; variationLabel: string | null }[]) => cards.map((c) => `${c.name} ${c.variationLabel}`);

describe("listShopCards", () => {
  it("lists one card per in-stock pack size in the old shop order", async () => {
    const res = await listShopCards();
    expect(names(res.cards)).toEqual([
      "Jivo Canola Oil 5 Litre",
      "Jivo Extra Virgin Olive Oil 1 Litre",
      "Jivo Canola Oil 1 Litre",
      "Sano Pomace Olive Oil 1 Litre",
      "Sano Pomace Olive Oil 5 Litre",
    ]);
    expect(res.total).toBe(5);
    expect(res.page).toBe(1);
    expect(res.perPage).toBe(12);
    expect(res.totalPages).toBe(1);
  });

  it("hides hidden products, drafts, out-of-stock packs and managed stock at 0", async () => {
    const res = await listShopCards({ perPage: -1 });
    const variationIds = res.cards.map((c) => c.variationId);
    for (const hidden of [ids.variations.juice160, ids.variations.draft1l, ids.variations.evoo200, ids.variations.mustard1l]) expect(variationIds).not.toContain(hidden);
  });

  it("builds card data (link with the pack, sale flag, category, brand, hover image)", async () => {
    const [first] = (await listShopCards()).cards;
    expect(first).toMatchObject({
      kind: "variation",
      variationId: ids.variations.canola5l,
      href: "/product/jivo-canola-oil/?attribute_pa_capacity=5l",
      pricePaise: 109900,
      regularPricePaise: 165000,
      onSale: true,
      inStock: true,
      category: { slug: "super-oils", name: "Super Oils" },
      brand: { slug: "jivo", name: "Jivo" },
      variationCount: 2,
    });
    expect(first.image?.url).toBe("/images/products/canola-front.jpg");
    expect(first.hoverImage).toBe("/images/products/canola-back.jpg");
  });

  it("filters by category and reports category counts", async () => {
    const offers = await listShopCards({ category: "special-offers" });
    expect(names(offers.cards)).toEqual(["Jivo Extra Virgin Olive Oil 1 Litre"]);
    const all = await listShopCards();
    expect(all.categoryCounts).toEqual([
      { slug: "super-oils", name: "Super Oils", count: 5 },
      { slug: "special-offers", name: "Special Offers", count: 1 },
    ]);
    expect((await listShopCards({ category: "does-not-exist" })).total).toBe(0);
  });

  it("filters by brand", async () => {
    expect(names((await listShopCards({ brand: "sano" })).cards)).toEqual(["Sano Pomace Olive Oil 1 Litre", "Sano Pomace Olive Oil 5 Litre"]);
  });

  it("filters by price range (inclusive) and reports the price bounds", async () => {
    const res = await listShopCards({ minPricePaise: 30000, maxPricePaise: 109900 });
    expect(names(res.cards)).toEqual(["Jivo Canola Oil 5 Litre", "Jivo Extra Virgin Olive Oil 1 Litre"]);
    expect(res.priceBounds).toEqual({ minPaise: 22000, maxPaise: 147500 });
  });

  it("filters by status: on sale, in stock, out of stock", async () => {
    const onSale = await listShopCards({ status: ["onsale"] });
    expect(onSale.total).toBe(4); // sano 5l is not discounted
    expect(names(onSale.cards)).not.toContain("Sano Pomace Olive Oil 5 Litre");
    expect((await listShopCards({ status: ["instock"] })).total).toBe(5);
    const oos = await listShopCards({ status: ["outofstock"] });
    expect(names(oos.cards).sort()).toEqual(["Jivo Extra Virgin Olive Oil 200 ml", "Jivo Kachi Ghani Mustard Oil 1 Litre"]);
  });

  it("search matches words in the name, pack, category and description", async () => {
    expect(names((await listShopCards({ q: "canola" })).cards)).toEqual(["Jivo Canola Oil 5 Litre", "Jivo Canola Oil 1 Litre"]);
    expect(names((await listShopCards({ q: "CANOLA 1 litre" })).cards)).toEqual(["Jivo Canola Oil 1 Litre"]);
    expect((await listShopCards({ q: "olive" })).total).toBe(3);
    // "omega" is only in the description; it must be combined with a title word to match
    expect((await listShopCards({ q: "omega" })).total).toBe(0);
    expect((await listShopCards({ q: "canola omega" })).total).toBe(2);
    expect((await listShopCards({ q: "ghee" })).total).toBe(0); // draft product is never found
    expect((await listShopCards({ q: "!!!" })).total).toBe(0);
    expect((await listShopCards({ q: "   " })).total).toBe(5); // blank search = everything
  });

  it("sorts by price (both ways), popularity, rating and date", async () => {
    expect((await listShopCards({ sort: "price" })).cards[0].pricePaise).toBe(22000);
    expect((await listShopCards({ sort: "price" })).cards.map((c) => c.pricePaise)).toEqual([22000, 29500, 72500, 109900, 147500]);
    expect((await listShopCards({ sort: "price-desc" })).cards.map((c) => c.pricePaise)).toEqual([147500, 109900, 72500, 29500, 22000]);
    expect(names((await listShopCards({ sort: "popularity" })).cards).slice(0, 2)).toEqual(["Sano Pomace Olive Oil 1 Litre", "Sano Pomace Olive Oil 5 Litre"]);
    expect(names((await listShopCards({ sort: "rating" })).cards)[0]).toBe("Jivo Extra Virgin Olive Oil 1 Litre");
    expect(names((await listShopCards({ sort: "date" })).cards)[0]).toBe("Jivo Extra Virgin Olive Oil 1 Litre");
  });

  it("falls back to default order for an unknown sort key", async () => {
    const res = await listShopCards({ sort: "bogus" as never });
    expect(res.cards[0].variationId).toBe(ids.variations.canola5l);
  });

  it("paginates, clamps the page number and supports perPage -1 (All)", async () => {
    const p1 = await listShopCards({ perPage: 2, page: 1 });
    expect(p1.cards).toHaveLength(2);
    expect(p1.totalPages).toBe(3);
    const p3 = await listShopCards({ perPage: 2, page: 3 });
    expect(names(p3.cards)).toEqual(["Sano Pomace Olive Oil 5 Litre"]);
    expect((await listShopCards({ perPage: 2, page: 99 })).page).toBe(3);
    expect((await listShopCards({ perPage: 2, page: -4 })).page).toBe(1);
    expect((await listShopCards({ perPage: 2, page: Number.NaN })).page).toBe(1);
    const all = await listShopCards({ perPage: -1 });
    expect(all.cards).toHaveLength(5);
    expect(all.perPage).toBe(-1);
    expect(all.totalPages).toBe(1);
  });

  it("an empty result still has one page", async () => {
    const res = await listShopCards({ q: "zzzz" });
    expect(res).toMatchObject({ total: 0, page: 1, totalPages: 1, cards: [] });
  });
});

describe("product helpers", () => {
  it("getProductBySlug returns published products only", async () => {
    expect((await getProductBySlug("jivo-canola-oil"))?.name).toBe("Jivo Canola Oil");
    expect(await getProductBySlug("draft-desi-ghee")).toBeNull();
  });

  it("product summary: min price from in-stock packs, in-stock flag, sorted variations", async () => {
    const evoo = (await getProductBySlug("jivo-extra-virgin-olive-oil"))!;
    expect(evoo.minPricePaise).toBe(72500); // the 199 pack is out of stock
    expect(evoo.inStock).toBe(true);
    const mustard = (await getProductBySlug("jivo-kachi-ghani-mustard-oil"))!;
    expect(mustard.inStock).toBe(false);
    expect(mustard.minPricePaise).toBeNull();
    const canola = (await getProductBySlug("jivo-canola-oil"))!;
    expect(canola.variations.map((v) => v.valueSlug)).toEqual(["1-litre", "5l"]);
  });

  it("selectVariation reads ?attribute_pa_capacity= or falls back to the default pack", async () => {
    const canola = (await getProductBySlug("jivo-canola-oil"))!;
    expect(selectVariation(canola, { attribute_pa_capacity: "5l" })?.valueSlug).toBe("5l");
    expect(selectVariation(canola, { attribute_pa_capacity: ["5l", "1-litre"] })?.valueSlug).toBe("5l");
    expect(selectVariation(canola, { attribute_pa_capacity: "nope" })?.valueSlug).toBe("1-litre");
    expect(selectVariation(canola)?.valueSlug).toBe("1-litre");
  });

  it("searchSuggestions returns one entry per product", async () => {
    const res = await searchSuggestions("oil");
    expect(res.map((s) => s.name)).toEqual(["Jivo Canola Oil", "Jivo Extra Virgin Olive Oil", "Sano Pomace Olive Oil"]);
    expect(res[0].href).toBe("/product/jivo-canola-oil/");
    expect(await searchSuggestions("  ")).toEqual([]);
  });
});
