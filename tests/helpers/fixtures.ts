/**
 * Small fake catalog for unit tests, inserted into an IN-MEMORY PGlite database.
 *
 * Usage (in a test file):
 *   const { db, ids } = await setupTestDb();
 *
 * PGLITE_DATA_DIR=memory is set by vitest.config.ts, so getDb() never opens ./.data/pglite.
 * Each test file runs in its own module scope; setupTestDb() also drops any cached client so
 * every file starts from an empty database with the migrations applied.
 */
import { getDb, schema, type Db } from "@/lib/db";

const rs = (rupees: number) => Math.round(rupees * 100);

export type FixtureIds = Awaited<ReturnType<typeof insertFixtures>>;

/** Returns a fresh in-memory database with the fixture catalog. */
export async function setupTestDb(): Promise<{ db: Db; ids: FixtureIds }> {
  if (process.env.PGLITE_DATA_DIR !== "memory") throw new Error("Unit tests must run with PGLITE_DATA_DIR=memory (see vitest.config.ts).");
  (globalThis as unknown as { __jivoDb?: unknown }).__jivoDb = undefined;
  const db = await getDb();
  const ids = await insertFixtures(db);
  return { db, ids };
}

async function insertFixtures(db: Db) {
  /* brands + categories */
  const [jivo, sano] = await db.insert(schema.brands).values([{ slug: "jivo", name: "Jivo" }, { slug: "sano", name: "Sano" }]).returning();
  const [oils, foods, offers] = await db
    .insert(schema.categories)
    .values([
      { slug: "super-oils", name: "Super Oils", sortOrder: 1 },
      { slug: "super-foods", name: "Super Foods", sortOrder: 2 },
      { slug: "special-offers", name: "Special Offers", sortOrder: 3 },
    ])
    .returning();

  /* products */
  const insertProduct = async (values: typeof schema.products.$inferInsert, categoryIds: number[]) => {
    const [row] = await db.insert(schema.products).values(values).returning();
    for (const categoryId of categoryIds) await db.insert(schema.productCategories).values({ productId: row.id, categoryId });
    return row;
  };
  const canola = await insertProduct(
    {
      legacyId: 20228,
      slug: "jivo-canola-oil",
      name: "Jivo Canola Oil",
      brandId: jivo.id,
      sortOrder: 10,
      ratingAvg: 4.6,
      ratingCount: 200,
      shortDescriptionHtml: "<p>Cold pressed canola oil, rich in <strong>omega 3</strong>.</p>",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
    [oils.id],
  );
  const evoo = await insertProduct(
    { legacyId: 21079, slug: "jivo-extra-virgin-olive-oil", name: "Jivo Extra Virgin Olive Oil", brandId: jivo.id, sortOrder: 20, ratingAvg: 4.8, ratingCount: 50, createdAt: new Date("2025-06-01T00:00:00Z") },
    [oils.id, offers.id],
  );
  const sanoOil = await insertProduct(
    { legacyId: 19314, slug: "sano-pomace-olive-oil", name: "Sano Pomace Olive Oil", brandId: sano.id, sortOrder: 30, ratingAvg: 4.2, ratingCount: 300, createdAt: new Date("2023-01-01T00:00:00Z") },
    [oils.id],
  );
  const juice = await insertProduct({ legacyId: 26191, slug: "jivo-wheatgrass-juice", name: "Jivo Wheatgrass Juice", brandId: jivo.id, sortOrder: 40, visible: false }, [foods.id]);
  const draft = await insertProduct({ legacyId: 22299, slug: "draft-desi-ghee", name: "Draft Desi Ghee", brandId: jivo.id, sortOrder: 50, status: "draft" }, [foods.id]);
  const mustard = await insertProduct({ legacyId: 19324, slug: "jivo-kachi-ghani-mustard-oil", name: "Jivo Kachi Ghani Mustard Oil", brandId: jivo.id, sortOrder: 60 }, [oils.id]);

  await db.insert(schema.productImages).values([
    { productId: canola.id, url: "/images/products/canola-front.jpg", alt: "Jivo Canola Oil", sortOrder: 0 },
    { productId: canola.id, url: "/images/products/canola-back.jpg", alt: "Jivo Canola Oil back", sortOrder: 1 },
    { productId: evoo.id, url: "/images/products/evoo.jpg", alt: "Jivo Extra Virgin Olive Oil", sortOrder: 0 },
  ]);

  /* variations (prices in paise); shopOrder = position in the shop grid */
  const v = async (values: typeof schema.variations.$inferInsert) => (await db.insert(schema.variations).values(values).returning())[0];
  const canola5l = await v({ productId: canola.id, legacyId: 20231, sku: "JSOCN-5L", valueSlug: "5l", valueLabel: "5 Litre", pricePaise: rs(1099), regularPricePaise: rs(1650), shopOrder: 1, sortOrder: 20 });
  const canola1l = await v({ productId: canola.id, legacyId: 20459, sku: "JSOCN-1L", valueSlug: "1-litre", valueLabel: "1 Litre", pricePaise: rs(220), regularPricePaise: rs(375), shopOrder: 3, sortOrder: 10, isDefault: true });
  const evoo1l = await v({ productId: evoo.id, legacyId: 21085, sku: "JSOEV-1L", valueSlug: "1-litre", valueLabel: "1 Litre", pricePaise: rs(725), regularPricePaise: rs(1799), shopOrder: 2, sortOrder: 10 });
  const evoo200 = await v({ productId: evoo.id, legacyId: 44175, sku: "JSOEV-200", valueSlug: "200ml", valueLabel: "200 ml", pricePaise: rs(199), regularPricePaise: rs(299), shopOrder: 4, sortOrder: 20, inStock: false });
  const sano1l = await v({ productId: sanoOil.id, legacyId: 22926, sku: "SSSOPO-1L", valueSlug: "1-litre", valueLabel: "1 Litre", pricePaise: rs(295), regularPricePaise: rs(999), shopOrder: 5, sortOrder: 10 });
  const sano5l = await v({ productId: sanoOil.id, legacyId: 22927, sku: "SSSOPO-5L", valueSlug: "5l", valueLabel: "5 Litre", pricePaise: rs(1475), regularPricePaise: rs(1475), shopOrder: 6, sortOrder: 20 });
  const juice160 = await v({ productId: juice.id, valueSlug: "160ml", valueLabel: "160 ml", pricePaise: rs(50), regularPricePaise: rs(50), shopOrder: 7 });
  const draft1l = await v({ productId: draft.id, valueSlug: "1l", valueLabel: "1 Litre", pricePaise: rs(500), regularPricePaise: rs(600), shopOrder: 8 });
  // managed stock with 0 left: counts as out of stock even though inStock is true
  const mustard1l = await v({ productId: mustard.id, legacyId: 22357, valueSlug: "1-litre", valueLabel: "1 Litre", pricePaise: rs(180), regularPricePaise: rs(255), shopOrder: 9, manageStock: true, stockQty: 0 });

  /* shipping zones */
  const [ncr] = await db.insert(schema.shippingZones).values({ name: "Delhi NCR", pincodePrefixes: ["110", "122", "201"], sortOrder: 1 }).returning();
  const [mh] = await db.insert(schema.shippingZones).values({ name: "Maharashtra", states: ["MH"], sortOrder: 2 }).returning();
  const [kl] = await db.insert(schema.shippingZones).values({ name: "Kerala (disabled)", states: ["KL"], enabled: false, sortOrder: 3 }).returning();
  const [rest] = await db.insert(schema.shippingZones).values({ name: "Rest of India", isRestOfCountry: true, sortOrder: 9 }).returning();
  await db.insert(schema.shippingRates).values([
    { zoneId: ncr.id, type: "free", label: "Free shipping", minOrderPaise: rs(999), sortOrder: 1 },
    { zoneId: ncr.id, type: "flat", label: "Flat rate", costPaise: rs(100), sortOrder: 2 },
    { zoneId: mh.id, type: "flat", label: "Maharashtra flat rate", costPaise: rs(50), sortOrder: 1 },
    { zoneId: kl.id, type: "flat", label: "Kerala flat rate", costPaise: rs(1), sortOrder: 1 },
    { zoneId: rest.id, type: "free", label: "Free shipping", minOrderPaise: rs(999), sortOrder: 1 },
    { zoneId: rest.id, type: "flat", label: "Flat rate", costPaise: rs(150), sortOrder: 2 },
  ]);

  /* coupons */
  await db.insert(schema.coupons).values([
    { code: "JIVO200", type: "fixed_cart", amount: rs(200), minSpendPaise: rs(5000), description: "Flat ₹200 off above ₹5000" },
    { code: "PCT10", type: "percent", amount: 10 },
    { code: "FREESHIP", type: "free_shipping", amount: 0 },
    { code: "EXPIRED", type: "fixed_cart", amount: rs(50), expiresAt: new Date("2020-01-01T00:00:00Z") },
    { code: "INACTIVE", type: "fixed_cart", amount: rs(50), active: false },
    { code: "ONCE", type: "fixed_cart", amount: rs(10), perUserLimit: 1 },
  ]);

  return {
    categories: { oils: oils.id, foods: foods.id, offers: offers.id },
    products: { canola: canola.id, evoo: evoo.id, sano: sanoOil.id, juice: juice.id, draft: draft.id, mustard: mustard.id },
    variations: {
      canola5l: canola5l.id,
      canola1l: canola1l.id,
      evoo1l: evoo1l.id,
      evoo200: evoo200.id,
      sano1l: sano1l.id,
      sano5l: sano5l.id,
      juice160: juice160.id,
      draft1l: draft1l.id,
      mustard1l: mustard1l.id,
    },
    zones: { ncr: ncr.id, mh: mh.id, kl: kl.id, rest: rest.id },
  };
}

/** Creates a cart with the given lines (variation id -> quantity) and optional coupon. */
export async function makeCart(db: Db, lines: [variationId: number, qty: number][], opts: { coupon?: string; userId?: number } = {}) {
  const token = `test${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`.padEnd(24, "x");
  const [cart] = await db.insert(schema.carts).values({ token, couponCode: opts.coupon ?? null, userId: opts.userId ?? null }).returning();
  for (const [variationId, qty] of lines) await db.insert(schema.cartItems).values({ cartId: cart.id, variationId, qty });
  return cart;
}
