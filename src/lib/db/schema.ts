/**
 * Database schema for Jivo Mart (PostgreSQL via Drizzle ORM).
 *
 * Money is stored as integers in paise (1 rupee = 100 paise) so totals never suffer
 * from floating-point rounding. Use formatINR(paise / 100) to show a price.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "admin"]);
export const addressType = pgEnum("address_type", ["billing", "shipping"]);
export const productTemplate = pgEnum("product_template", ["rich", "standard"]);
export const productStatus = pgEnum("product_status", ["publish", "draft"]);
export const reviewStatus = pgEnum("review_status", ["approved", "pending", "spam"]);
export const couponType = pgEnum("coupon_type", ["fixed_cart", "percent", "free_shipping"]);
export const shippingRateType = pgEnum("shipping_rate_type", ["flat", "free"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "failed",
  "refunded",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/* ---------- Users & auth ---------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 190 }).notNull(),
    passwordHash: text("password_hash"),
    name: varchar("name", { length: 120 }),
    phone: varchar("phone", { length: 40 }),
    role: userRole("role").default("customer").notNull(),
    sessionVersion: integer("session_version").default(1).notNull(),
    legacyId: integer("legacy_id"),
    marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  purpose: varchar("purpose", { length: 32 }).default("reset").notNull(), // reset | set_password
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 190 }).notNull(),
    ip: varchar("ip", { length: 64 }),
    success: boolean("success").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: addressType("type").notNull(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  company: varchar("company", { length: 120 }),
  address1: varchar("address_1", { length: 200 }).notNull(),
  address2: varchar("address_2", { length: 200 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 8 }).notNull(), // ISO state code, e.g. DL
  postcode: varchar("postcode", { length: 12 }).notNull(),
  country: varchar("country", { length: 2 }).default("IN").notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 190 }),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});

/* ---------- Catalog ---------- */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 300 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  showInMenu: boolean("show_in_menu").default(true).notNull(),
  legacyId: integer("legacy_id"),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    legacyId: integer("legacy_id"),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    template: productTemplate("template").default("standard").notNull(),
    status: productStatus("status").default("publish").notNull(),
    visible: boolean("visible").default(true).notNull(), // shown in shop grid / search
    featured: boolean("featured").default(false).notNull(),
    brandId: integer("brand_id").references(() => brands.id),
    tagline: varchar("tagline", { length: 200 }),
    shortDescriptionHtml: text("short_description_html"),
    descriptionHtml: text("description_html"),
    disclaimerHtml: text("disclaimer_html"),
    additionalInfo: jsonb("additional_info").$type<[string, string][]>().default([]).notNull(),
    ratingAvg: real("rating_avg").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    ratingText: varchar("rating_text", { length: 60 }), // e.g. "235" shown as "235 Reviews"
    unitsSoldText: varchar("units_sold_text", { length: 60 }), // e.g. "1.1 Lakh+"
    estimatedDelivery: varchar("estimated_delivery", { length: 60 }),
    attributeName: varchar("attribute_name", { length: 60 }).default("Capacity").notNull(),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: varchar("seo_description", { length: 320 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (t) => [index("products_visible_idx").on(t.visible, t.status)],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] })],
);

export const productTags = pgTable(
  "product_tags",
  {
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
    tag: varchar("tag", { length: 80 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.tag] })],
);

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  url: varchar("url", { length: 400 }).notNull(),
  alt: varchar("alt", { length: 200 }),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const variations = pgTable(
  "variations",
  {
    id: serial("id").primaryKey(),
    legacyId: integer("legacy_id"),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
    sku: varchar("sku", { length: 80 }),
    attributeSlug: varchar("attribute_slug", { length: 60 }).default("pa_capacity").notNull(),
    valueSlug: varchar("value_slug", { length: 80 }).notNull(), // e.g. "1-litre"
    valueLabel: varchar("value_label", { length: 120 }).notNull(), // e.g. "1 Litre"
    title: varchar("title", { length: 240 }), // card title on category pages, e.g. "Jivo Kachi Ghani Mustard Oil – 1 Litre"
    shopOrder: integer("shop_order").default(1000).notNull(), // position in the shop grid (old site order)
    swatchImage: varchar("swatch_image", { length: 400 }),
    image: varchar("image", { length: 400 }),
    pricePaise: integer("price_paise").notNull(),
    regularPricePaise: integer("regular_price_paise").notNull(),
    manageStock: boolean("manage_stock").default(false).notNull(),
    stockQty: integer("stock_qty"),
    inStock: boolean("in_stock").default(true).notNull(),
    weightGrams: integer("weight_grams"),
    isDefault: boolean("is_default").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (t) => [index("variations_product_idx").on(t.productId)],
);

/** Landing-page content for the 12 "rich" products (benefits, videos, FAQs...). */
export const productContent = pgTable("product_content", {
  productId: integer("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<ProductContentData>().notNull(),
});

/**
 * Extra page content per product, copied from the old Elementor product pages.
 * Rich template (12 oil/ghee products) uses most fields; standard template uses
 * claims, stories, fbt and related. Image paths point to /public/images/...
 */
export type ProductContentData = {
  /* shared */
  claims?: string[]; // marquee: "Rich in antioxidants", "Improves digestion", ...
  storiesHeading?: string; // "Customer Stories"
  storiesSubheading?: string; // "Over 5 Lakh+ customers trust Jivo for their family's health"
  stories?: { text: string; name: string; source?: string; image?: string | null }[];
  /* standard template */
  fbt?: string[]; // "Frequently Bought Together" product slugs
  related?: string[]; // "Related Products" product slugs
  /* rich template */
  benefits?: string[]; // 6 short benefit bullets next to the price
  statBoxes?: string[]; // "#1 Top seller in India", "1L+ Families Served", ...
  trustStrip?: string | null; // small badge strip under the gallery (desktop)
  newsBanner?: string | null; // "In the news" wide image (desktop)
  newsLogos?: string[]; // logo marquee (mobile)
  videos?: string[]; // short reels, /media/videos/<file>.mp4
  benefitsHeading?: string; // "Follow Your Heart to a Healthy Life"
  benefitCards?: { title: string; text: string }[];
  reasonsHeading?: string; // "6 Reasons Why Our ... Should Be An Addition To Your Life!"
  reasonsImageDesktop?: string | null;
  reasonsImageMobile?: string | null;
  cookingHeading?: string; // "Healthy Food With Great Taste!" (mobile/tablet)
  cookingImages?: { image: string | null; label: string }[];
  comparison?: { heading: string; usImage: string | null; us: string[]; othersHeading: string; othersImage: string | null; others: string[] }; // mobile/tablet
  comparisonImage?: string | null; // desktop infographic of the same comparison
  faqHeading?: string; // "Got questions? We've got answers"
  faqTabs?: string[];
  faqs?: { q: string; a: string }[]; // answer is simple HTML
};

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    legacyId: integer("legacy_id"),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 120 }).notNull(),
    authorEmail: varchar("author_email", { length: 190 }),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    verified: boolean("verified").default(false).notNull(),
    status: reviewStatus("status").default("approved").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reviews_product_idx").on(t.productId, t.status)],
);

/* ---------- Cart ---------- */

export const carts = pgTable(
  "carts",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    couponCode: varchar("coupon_code", { length: 40 }),
    shippingState: varchar("shipping_state", { length: 8 }),
    shippingPostcode: varchar("shipping_postcode", { length: 12 }),
    ...timestamps,
  },
  (t) => [index("carts_user_idx").on(t.userId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
    variationId: integer("variation_id").references(() => variations.id, { onDelete: "cascade" }).notNull(),
    qty: integer("qty").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cart_items_unique").on(t.cartId, t.variationId)],
);

/* ---------- Promotions & shipping ---------- */

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: couponType("type").notNull(),
  amount: integer("amount").default(0).notNull(), // paise for fixed_cart, percent (0-100) for percent
  minSpendPaise: integer("min_spend_paise"),
  maxSpendPaise: integer("max_spend_paise"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0).notNull(),
  perUserLimit: integer("per_user_limit"),
  active: boolean("active").default(true).notNull(),
  description: varchar("description", { length: 200 }),
  ...timestamps,
});

export const couponUsages = pgTable("coupon_usages", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  orderId: integer("order_id"),
  email: varchar("email", { length: 190 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shippingZones = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  states: jsonb("states").$type<string[]>().default([]).notNull(), // ISO codes, e.g. ["DL"]
  pincodePrefixes: jsonb("pincode_prefixes").$type<string[]>().default([]).notNull(), // e.g. ["110","122","201"]
  isRestOfCountry: boolean("is_rest_of_country").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  codEnabled: boolean("cod_enabled").default(false).notNull(), // "Cash on delivery" offered at checkout for this zone
  codUnavailableNotice: varchar("cod_unavailable_notice", { length: 200 }), // blue box shown in this zone when COD is off
  note: varchar("note", { length: 300 }),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const shippingRates = pgTable("shipping_rates", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").references(() => shippingZones.id, { onDelete: "cascade" }).notNull(),
  type: shippingRateType("type").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  costPaise: integer("cost_paise").default(0).notNull(),
  minOrderPaise: integer("min_order_paise"), // free shipping from this subtotal
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

/* ---------- Orders ---------- */

export type OrderAddress = {
  fullName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 24 }).notNull().unique(),
    legacyId: integer("legacy_id"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 190 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    status: orderStatus("status").default("pending_payment").notNull(),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    subtotalPaise: integer("subtotal_paise").notNull(),
    discountPaise: integer("discount_paise").default(0).notNull(),
    shippingPaise: integer("shipping_paise").default(0).notNull(),
    totalPaise: integer("total_paise").notNull(),
    couponCode: varchar("coupon_code", { length: 40 }),
    shippingMethod: varchar("shipping_method", { length: 80 }),
    billing: jsonb("billing").$type<OrderAddress>().notNull(),
    shipping: jsonb("shipping").$type<OrderAddress>().notNull(),
    customerNote: text("customer_note"),
    paymentProvider: varchar("payment_provider", { length: 30 }).default("razorpay").notNull(),
    razorpayOrderId: varchar("razorpay_order_id", { length: 64 }),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 64 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    trackingNumber: varchar("tracking_number", { length: 80 }),
    trackingUrl: varchar("tracking_url", { length: 300 }),
    courier: varchar("courier", { length: 80 }),
    accessToken: varchar("access_token", { length: 64 }).notNull(), // lets a guest view their thank-you page
    stockReduced: boolean("stock_reduced").default(false).notNull(),
    emailSent: boolean("email_sent").default(false).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    ...timestamps,
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_email_idx").on(t.email), index("orders_rzp_idx").on(t.razorpayOrderId)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  variationId: integer("variation_id").references(() => variations.id, { onDelete: "set null" }),
  productSlug: varchar("product_slug", { length: 160 }),
  productName: varchar("product_name", { length: 200 }).notNull(),
  variationLabel: varchar("variation_label", { length: 120 }),
  sku: varchar("sku", { length: 80 }),
  image: varchar("image", { length: 400 }),
  qty: integer("qty").notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
  lineTotalPaise: integer("line_total_paise").notNull(),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  message: text("message"),
  actor: varchar("actor", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------- Customer engagement ---------- */

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  variationId: integer("variation_id").references(() => variations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 190 }).notNull(),
  consent: boolean("consent").default(true).notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wishlists = pgTable(
  "wishlists",
  {
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  source: varchar("source", { length: 40 }).default("footer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 190 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("new").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------- Content ---------- */

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  seoTitle: varchar("seo_title", { length: 200 }),
  seoDescription: varchar("seo_description", { length: 320 }),
  ...timestamps,
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  legacyId: integer("legacy_id"),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  title: varchar("title", { length: 240 }).notNull(),
  excerpt: text("excerpt"),
  bodyHtml: text("body_html").notNull(),
  coverImage: varchar("cover_image", { length: 400 }),
  category: varchar("category", { length: 80 }).default("Health & Wellness").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ---------- Relations (for db.query.*) ---------- */

export const productsRelations = relations(products, ({ many, one }) => ({
  images: many(productImages),
  variations: many(variations),
  productCategories: many(productCategories),
  tags: many(productTags),
  reviews: many(reviews),
  content: one(productContent, { fields: [products.id], references: [productContent.productId] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({ product: one(products, { fields: [productImages.productId], references: [products.id] }) }));
export const variationsRelations = relations(variations, ({ one }) => ({ product: one(products, { fields: [variations.productId], references: [products.id] }) }));
export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}));
export const productTagsRelations = relations(productTags, ({ one }) => ({ product: one(products, { fields: [productTags.productId], references: [products.id] }) }));
export const categoriesRelations = relations(categories, ({ many }) => ({ productCategories: many(productCategories) }));
export const reviewsRelations = relations(reviews, ({ one }) => ({ product: one(products, { fields: [reviews.productId], references: [products.id] }) }));
export const productContentRelations = relations(productContent, ({ one }) => ({ product: one(products, { fields: [productContent.productId], references: [products.id] }) }));
export const cartsRelations = relations(carts, ({ many, one }) => ({ items: many(cartItems), user: one(users, { fields: [carts.userId], references: [users.id] }) }));
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variation: one(variations, { fields: [cartItems.variationId], references: [variations.id] }),
}));
export const ordersRelations = relations(orders, ({ many, one }) => ({ items: many(orderItems), events: many(orderEvents), user: one(users, { fields: [orders.userId], references: [users.id] }) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }) }));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({ order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }) }));
export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({ rates: many(shippingRates) }));
export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({ zone: one(shippingZones, { fields: [shippingRates.zoneId], references: [shippingZones.id] }) }));
export const usersRelations = relations(users, ({ many }) => ({ addresses: many(addresses), orders: many(orders), wishlists: many(wishlists) }));
export const addressesRelations = relations(addresses, ({ one }) => ({ user: one(users, { fields: [addresses.userId], references: [users.id] }) }));
export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  product: one(products, { fields: [wishlists.productId], references: [products.id] }),
}));

export type Product = typeof products.$inferSelect;
export type Variation = typeof variations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type ShippingZone = typeof shippingZones.$inferSelect;
export type ShippingRate = typeof shippingRates.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Page = typeof pages.$inferSelect;
