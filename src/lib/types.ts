/**
 * Shared view types used by pages and components.
 * Money is always in paise (integer). Use formatPaise() from "@/lib/pricing" to display.
 * Everything here is plain JSON (no Date objects) so it can be cached and sent to the browser.
 */
import type { ProductContentData } from "@/lib/db/schema";

export type ImageView = { url: string; alt: string; width: number | null; height: number | null };

export type VariationView = {
  id: number;
  legacyId: number | null;
  sku: string | null;
  attributeSlug: string; // "pa_capacity" | "capacity" | "pa_size"
  valueSlug: string; // "1-litre"
  valueLabel: string; // "1 Litre"
  title: string | null; // card title on category pages, e.g. "Jivo Kachi Ghani Mustard Oil – 1 Litre"
  swatchImage: string | null;
  image: string | null;
  pricePaise: number;
  regularPricePaise: number;
  inStock: boolean;
  manageStock: boolean;
  stockQty: number | null;
  isDefault: boolean;
  sortOrder: number;
  shopOrder: number;
};

export type CategoryRef = { slug: string; name: string };

export type ProductSummary = {
  id: number;
  legacyId: number | null;
  slug: string;
  name: string;
  template: "rich" | "standard";
  visible: boolean;
  featured: boolean;
  brand: CategoryRef | null;
  categories: CategoryRef[];
  tags: string[];
  images: ImageView[];
  variations: VariationView[]; // sorted by sortOrder
  ratingAvg: number;
  ratingCount: number;
  ratingText: string | null; // big number shown on rich pages, e.g. "235"
  unitsSoldText: string | null; // "1.1 Lakh+"
  tagline: string | null;
  estimatedDelivery: string | null;
  attributeName: string; // "Capacity"
  inStock: boolean; // at least one variation in stock
  onSale: boolean;
  minPricePaise: number | null; // cheapest in-stock variation (null when nothing is sellable)
  minRegularPricePaise: number | null;
  sortOrder: number;
  createdAt: string; // ISO
};

export type ProductDetail = ProductSummary & {
  shortDescriptionHtml: string | null;
  descriptionHtml: string | null;
  disclaimerHtml: string | null;
  additionalInfo: [string, string][];
  content: ProductContentData;
  seoTitle: string | null;
  seoDescription: string | null;
};

/** One card in a product grid or carousel. */
export type ProductCardData = {
  key: string; // unique React key, e.g. "v-21214" or "p-21211"
  kind: "variation" | "product";
  productId: number;
  variationId: number | null; // set for "variation" cards (adds that pack directly)
  slug: string;
  href: string; // product URL, with ?attribute_... for variation cards
  name: string; // product name
  variationTitle: string | null; // e.g. "Jivo Cold Pressed Groundnut Oil – 1+1" (category pages)
  variationLabel: string | null; // e.g. "1+1"
  image: ImageView | null;
  hoverImage: string | null; // second image shown on hover
  pricePaise: number | null;
  regularPricePaise: number | null;
  inStock: boolean;
  onSale: boolean;
  category: CategoryRef | null; // first category, shown above the title
  categories: CategoryRef[];
  brand: CategoryRef | null;
  ratingAvg: number;
  ratingCount: number;
  variationCount: number; // >1 means the product card should say "Select options"
};

export type SortKey = "menu_order" | "popularity" | "rating" | "date" | "price" | "price-desc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "menu_order", label: "Default sorting" },
  { value: "popularity", label: "Sort by popularity" },
  { value: "rating", label: "Sort by average rating" },
  { value: "date", label: "Sort by latest" },
  { value: "price", label: "Sort by price: low to high" },
  { value: "price-desc", label: "Sort by price: high to low" },
];

export const PER_PAGE_OPTIONS = [12, 24, 36] as const; // plus "All" (-1)

export type ListingQuery = {
  category?: string | null; // category slug
  q?: string | null; // search text
  sort?: SortKey;
  page?: number;
  perPage?: number; // -1 = all
  minPricePaise?: number | null;
  maxPricePaise?: number | null;
  status?: ("instock" | "outofstock" | "onsale")[];
  brand?: string | null;
};

export type ListingResult = {
  cards: ProductCardData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  priceBounds: { minPaise: number; maxPaise: number }; // across the unfiltered set (for the price slider)
  categoryCounts: { slug: string; name: string; count: number }[];
};

export type CategoryView = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  productCount: number; // visible products in this category
};

export type ReviewView = {
  id: number;
  authorName: string;
  rating: number;
  body: string;
  verified: boolean;
  createdAt: string; // ISO
};

export type ReviewSummary = { average: number; count: number; histogram: Record<1 | 2 | 3 | 4 | 5, number> };

export type PostView = {
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  coverImage: string | null;
  category: string;
  publishedAt: string;
};

export type PageView = { slug: string; title: string; bodyHtml: string; seoTitle: string | null; seoDescription: string | null; updatedAt: string };

/* ---------------- Cart ---------------- */

export type CartLine = {
  variationId: number;
  productId: number;
  slug: string;
  href: string;
  name: string;
  variationLabel: string;
  attributeName: string;
  image: string | null;
  qty: number;
  unitPricePaise: number;
  regularPricePaise: number;
  lineTotalPaise: number;
  inStock: boolean;
  maxQty: number;
};

export type ShippingOptionView = { id: string; label: string; costPaise: number; type: "flat" | "free" };

export type CartView = {
  items: CartLine[];
  itemCount: number; // sum of quantities (badge number)
  subtotalPaise: number;
  discountPaise: number;
  coupon: { code: string; description: string | null; freeShipping: boolean } | null;
  shipping: {
    destination: { state: string; postcode: string } | null;
    options: ShippingOptionView[];
    selected: ShippingOptionView | null;
    costPaise: number;
    available: boolean; // false when an address is known but no zone serves it
    zoneName: string | null;
  };
  totalPaise: number;
  freeShipping: { thresholdPaise: number | null; remainingPaise: number; reached: boolean };
  notices: string[]; // e.g. "Some items in your cart are no longer available and were removed."
  user: { id: number; name: string | null; email: string; role: "customer" | "admin" } | null;
};

export type CartApiResponse = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart: CartView | null };

/* ---------------- Search popup ---------------- */
export type SearchSuggestion = { name: string; href: string; image: string | null; pricePaise: number | null; regularPricePaise: number | null; category: string | null };
