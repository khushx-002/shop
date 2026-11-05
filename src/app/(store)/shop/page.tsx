/**
 * /shop/ – all products (also search results: /shop/?s=canola&product_cat=super-oils).
 * Reads searchParams, so it renders per request; the data comes from the cached catalog.
 */
import type { Metadata } from "next";
import { ShopView } from "@/components/catalog/ShopView";
import { shopMetadata } from "@/components/catalog/meta";
import type { RawParams } from "@/components/catalog/params";

type Props = { searchParams: Promise<RawParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return shopMetadata(1, await searchParams);
}

export default async function ShopPage({ searchParams }: Props) {
  return <ShopView page={1} searchParams={await searchParams} />;
}
