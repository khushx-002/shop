/**
 * Metadata for the listing pages. Canonical = the page path without the query string;
 * any query parameter (search, filter, sort, view) makes the page noindex.
 */
import type { Metadata } from "next";
import { hasAnyParam, type RawParams } from "@/components/catalog/params";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";
import type { CategoryView } from "@/lib/types";

function searchText(sp: RawParams): string {
  const raw = sp.s;
  return ((Array.isArray(raw) ? raw[0] : raw) ?? "").trim().slice(0, 100);
}

export function shopMetadata(page: number, sp: RawParams): Metadata {
  const s = searchText(sp);
  const title = s ? `Search Results for “${s}”` : page > 1 ? `Products – Page ${page}` : "Products";
  return pageMetadata({
    title,
    description: s ? `Jivo Mart products matching “${s}”.` : "Shop Jivo cold-pressed oils, olive oils, ghee, juices and healthy foods online. One card per pack size, delivered across India.",
    path: routes.shopPage(page),
    noindex: hasAnyParam(sp),
  });
}

export function categoryMetadata(category: CategoryView, page: number, sp: RawParams): Metadata {
  return pageMetadata({
    title: page > 1 ? `${category.name} – Page ${page}` : category.name,
    description: category.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) || `Buy Jivo ${category.name} online at the official Jivo Mart store.`,
    path: routes.categoryPage(category.slug, page),
    image: category.image,
    noindex: hasAnyParam(sp),
  });
}
