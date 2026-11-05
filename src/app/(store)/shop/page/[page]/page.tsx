/**
 * /shop/page/N/ – page N of the shop grid (the "Load More" button links here when
 * JavaScript is off). /shop/page/1/ redirects to /shop/, invalid numbers are 404.
 */
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ShopView } from "@/components/catalog/ShopView";
import { shopMetadata } from "@/components/catalog/meta";
import { parseListingParams, parsePageSegment, queryString, type RawParams } from "@/components/catalog/params";
import { routes } from "@/lib/routes";

type Props = { params: Promise<{ page: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const page = parsePageSegment((await params).page);
  if (!page) return {};
  return shopMetadata(page, await searchParams);
}

export default async function ShopPagedPage({ params, searchParams }: Props) {
  const page = parsePageSegment((await params).page);
  if (!page) notFound();
  const sp = await searchParams;
  if (page === 1) permanentRedirect(routes.shop + queryString(parseListingParams(sp).params));
  return <ShopView page={page} searchParams={sp} />;
}
