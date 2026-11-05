/**
 * /product/<slug>/ – single product page (same URLs as the old WooCommerce site).
 *
 * Static + cached: built on the first visit, refreshed at most every 10 minutes.
 * No cookies or searchParams are read on the server; the cart, login state and the
 * ?attribute_pa_capacity= pack choice are handled in the browser.
 * Hidden products (visible = false) still have a page, like on the old site.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductPackProvider } from "@/components/product/PackContext";
import { RichProduct } from "@/components/product/RichProduct";
import { StandardProduct } from "@/components/product/StandardProduct";
import { loadProductPage } from "@/components/product/page-data";
import { stripHtml, truncate } from "@/components/product/product-utils";
import type { Crumb } from "@/components/ui/Breadcrumbs";
import { getProductBySlug, selectVariation } from "@/lib/catalog";
import { routes } from "@/lib/routes";
import { faqJsonLd, pageMetadata, productJsonLd } from "@/lib/seo";

export const revalidate = 600;

/** No pages at build time: each product page is generated on its first visit, then cached. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const description = truncate(stripHtml(product.seoDescription || product.shortDescriptionHtml || product.descriptionHtml) || product.name, 160);
  return pageMetadata({
    title: product.seoTitle || product.name,
    description,
    path: routes.product(product.slug),
    image: product.images[0]?.url ?? null,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadProductPage(slug);
  if (!data) notFound();
  const { product } = data;

  const category = product.categories[0];
  // <Breadcrumbs> also prints the BreadcrumbList JSON-LD.
  const crumbs: Crumb[] = [{ label: "Home", href: routes.home }, ...(category ? [{ label: category.name, href: routes.category(category.slug) }] : []), { label: product.name }];
  const defaultPack = selectVariation(product);
  const faqs = product.template === "rich" ? (product.content.faqs ?? []) : [];

  return (
    <>
      <JsonLd data={productJsonLd(product, data.reviews)} />
      {faqs.length > 0 && <JsonLd data={faqJsonLd(faqs)} />}
      <ProductPackProvider productId={product.id} productName={product.name} variations={product.variations} defaultVariationId={defaultPack?.id ?? null}>
        {product.template === "rich" ? <RichProduct data={data} crumbs={crumbs} /> : <StandardProduct data={data} crumbs={crumbs} />}
      </ProductPackProvider>
    </>
  );
}
