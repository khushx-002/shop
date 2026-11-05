/**
 * /product-category/<slug>/ – category page (same URLs as the old WooCommerce site).
 * Unknown category -> 404.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView } from "@/components/catalog/CategoryView";
import { categoryMetadata } from "@/components/catalog/meta";
import type { RawParams } from "@/components/catalog/params";
import { getCategory } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  return categoryMetadata(category, 1, await searchParams);
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategory((await params).slug);
  if (!category) notFound();
  return <CategoryView category={category} page={1} searchParams={await searchParams} />;
}
