/**
 * URL parameters of the shop / category / search pages (same names as WooCommerce + XStore,
 * so old links and the header search popup keep working):
 *
 *   orderby      menu_order | popularity | rating | date | price | price-desc
 *   et_per_page  12 | 24 | 36 | -1 (all)       (per_page is accepted too)
 *   min_price, max_price   whole rupees
 *   stock_status comma list of instock,outofstock,onsale
 *   s            search text          product_cat  category slug (shop page only)
 *   view_mode    grid | list
 *
 * Pure functions only (no server imports) so client components can use them too.
 */
import { PER_PAGE_OPTIONS, SORT_OPTIONS, type ListingQuery, type SortKey } from "@/lib/types";

export type RawParams = Record<string, string | string[] | undefined>;
/** Normalised, string-only copy of the query we understand (used to build links). */
export type CleanParams = Record<string, string>;

export type ViewMode = "grid" | "list";
export type StockStatus = "instock" | "outofstock" | "onsale";

export type ParsedListing = {
  query: ListingQuery; // for listShopCards (page is set by the caller)
  params: CleanParams; // only the known, valid params (links and forms keep these)
  view: ViewMode;
  search: string; // trimmed search text ("" when none)
  category: string | null; // product_cat
  perPage: number; // 12 / 24 / 36 / -1
  sort: SortKey;
  status: StockStatus[];
  minPrice: number | null; // rupees
  maxPrice: number | null;
};

export const DEFAULT_PER_PAGE = 12;
const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((o) => o.value));
const STATUS_KEYS: StockStatus[] = ["instock", "outofstock", "onsale"];
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function rupees(v: string): number | null {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v));
}

/** Reads the page's searchParams (or a URLSearchParams) into a validated listing query. */
export function parseListingParams(input: RawParams | URLSearchParams): ParsedListing {
  const raw: RawParams = input instanceof URLSearchParams ? Object.fromEntries(input.entries()) : input;
  const params: CleanParams = {};

  const sortRaw = first(raw.orderby);
  const sort: SortKey = SORT_KEYS.has(sortRaw) ? (sortRaw as SortKey) : "menu_order";
  if (sortRaw && sort !== "menu_order") params.orderby = sort;

  const perRaw = Number(first(raw.et_per_page) || first(raw.per_page));
  const perPage = perRaw === -1 || (PER_PAGE_OPTIONS as readonly number[]).includes(perRaw) ? perRaw : DEFAULT_PER_PAGE;
  if (perPage !== DEFAULT_PER_PAGE) params.et_per_page = String(perPage);

  let minPrice = rupees(first(raw.min_price));
  let maxPrice = rupees(first(raw.max_price));
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  if (minPrice != null) params.min_price = String(minPrice);
  if (maxPrice != null) params.max_price = String(maxPrice);

  const status = STATUS_KEYS.filter((k) => first(raw.stock_status).split(",").map((x) => x.trim()).includes(k));
  if (status.length) params.stock_status = status.join(",");

  const search = first(raw.s).slice(0, 100);
  if (search) params.s = search;

  const catRaw = first(raw.product_cat).toLowerCase();
  const category = SLUG_RE.test(catRaw) ? catRaw : null;
  if (category) params.product_cat = category;

  const view: ViewMode = first(raw.view_mode) === "list" ? "list" : "grid";
  if (view === "list") params.view_mode = "list";

  return {
    query: {
      sort,
      perPage,
      q: search || null,
      category,
      minPricePaise: minPrice != null ? minPrice * 100 : null,
      maxPricePaise: maxPrice != null ? maxPrice * 100 : null,
      status,
    },
    params,
    view,
    search,
    category,
    perPage,
    sort,
    status,
    minPrice,
    maxPrice,
  };
}

/** "?a=1&b=2" (or "") from params, with optional changes (null/"" removes a key). */
export function queryString(params: CleanParams, changes: Record<string, string | null | undefined> = {}): string {
  const merged: Record<string, string> = { ...params };
  for (const [k, v] of Object.entries(changes)) {
    if (v == null || v === "") delete merged[k];
    else merged[k] = v;
  }
  const qs = new URLSearchParams(merged).toString();
  return qs ? `?${qs}` : "";
}

/** True when the URL has any query parameter (search, filter, sort...): such pages are noindex. */
export function hasAnyParam(raw: RawParams): boolean {
  return Object.values(raw).some((v) => v !== undefined);
}

/** Parses a "/page/N/" segment. Returns null for anything that is not a whole number >= 1. */
export function parsePageSegment(value: string): number | null {
  if (!/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}
