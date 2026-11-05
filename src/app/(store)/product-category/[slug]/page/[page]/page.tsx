/**
 * /product-category/<slug>/page/N/ – numbered pages of a category.
 * Page 1 redirects to the category URL; unknown category or invalid page -> 404.
 */
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CategoryView } from "@/components/catalog/CategoryView";
import { categoryMetadata } from "@/components/catalog/meta";
import { parseListingParams, parsePageSegment, queryString, type RawParams } from "@/components/catalog/params";
import { getCategory } from "@/lib/catalog";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ slug: string; page: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, page: raw } = await params;
  const [category, page] = [await getCategory(slug), parsePageSegment(raw)];
  if (!category || !page) return {};
  return categoryMetadata(category, page, await searchParams);
}

export default async function CategoryPagedPage({ params, searchParams }: Props) {
  const { slug, page: raw } = await params;
  const page = parsePageSegment(raw);
  const category = page ? await getCategory(slug) : null;
  if (!category || !page) notFound();
  const sp = await searchParams;
  if (page === 1) {
    const params = parseListingParams(sp).params;
    delete params.product_cat;
    permanentRedirect(routes.category(category.slug) + queryString(params));
  }
  return <CategoryView category={category} page={page} searchParams={sp} />;
}
