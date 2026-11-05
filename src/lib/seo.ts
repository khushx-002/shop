/**
 * SEO helpers: canonical URLs and schema.org JSON-LD objects.
 * Render JSON-LD with <JsonLd data={...} /> from "@/components/seo/JsonLd".
 */
import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import type { PostView, ProductDetail, ReviewView } from "@/lib/types";
import { rupees } from "@/lib/pricing";

const base = () => SITE.url.replace(/\/$/, "");

/** Absolute URL for a site path ("/product/x/" -> "https://shop.jivo.in/product/x/"). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return base() + (path.startsWith("/") ? path : `/${path}`);
}

/** Standard page metadata with canonical + Open Graph. `title` gets " – Jivo Mart | Store" appended by the root layout. */
export function pageMetadata(opts: { title: string; description?: string | null; path: string; image?: string | null; noindex?: boolean; absoluteTitle?: boolean }): Metadata {
  const description = opts.description ?? SITE.description;
  // Without a page image, use the default 1200x630 share image (src/app/opengraph-image.png).
  const image = opts.image ? absoluteUrl(opts.image) : absoluteUrl("/opengraph-image.png");
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description,
    alternates: { canonical: opts.path },
    openGraph: { title: opts.title, description, url: absoluteUrl(opts.path), siteName: SITE.name, images: [{ url: image }], locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image", title: opts.title, description, images: [image] },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.parentCompany,
    alternateName: "Jivo",
    url: base() + "/",
    logo: absoluteUrl("/images/brand/White-Logo-Green-BG-300x300.jpg"),
    email: SITE.email,
    telephone: SITE.phone,
    address: { "@type": "PostalAddress", streetAddress: "A-35/1, Industrial Area Phase 1, Mayapuri", addressLocality: "New Delhi", postalCode: "110064", addressCountry: "IN" },
    sameAs: Object.values(SITE.social),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: base() + "/",
    potentialAction: { "@type": "SearchAction", target: `${base()}/shop/?s={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbJsonLd(items: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, ...(c.path ? { item: absoluteUrl(c.path) } : {}) })),
  };
}

/** Product schema with one Offer per pack size and the real review rating. */
export function productJsonLd(p: ProductDetail, reviews: ReviewView[] = []) {
  const url = absoluteUrl(`/product/${p.slug}/`);
  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;
  const offers = p.variations
    .filter((v) => v.pricePaise > 0)
    .map((v) => ({
      "@type": "Offer",
      name: `${p.name} – ${v.valueLabel}`,
      sku: v.sku || `${p.legacyId ?? p.id}-${v.valueSlug}`,
      url: `${url}?attribute_${v.attributeSlug}=${encodeURIComponent(v.valueSlug)}`,
      price: rupees(v.pricePaise).toFixed(2),
      priceCurrency: "INR",
      priceValidUntil,
      availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE.parentCompany },
    }));
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url,
    image: p.images.slice(0, 6).map((i) => absoluteUrl(i.url)),
    description: (p.seoDescription || p.shortDescriptionHtml || p.descriptionHtml || p.name).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
    brand: { "@type": "Brand", name: p.brand?.name ?? "Jivo" },
    category: p.categories[0]?.name,
  };
  if (offers.length) data.offers = offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: Math.min(...offers.map((o) => Number(o.price))).toFixed(2), highPrice: Math.max(...offers.map((o) => Number(o.price))).toFixed(2), offerCount: offers.length, offers };
  if (p.ratingCount > 0 && p.ratingAvg > 0) data.aggregateRating = { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(2), reviewCount: p.ratingCount, bestRating: "5", worstRating: "1" };
  if (reviews.length) {
    data.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.authorName },
      datePublished: r.createdAt.slice(0, 10),
      reviewBody: r.body,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    }));
  }
  return data;
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() } })),
  };
}

export function articleJsonLd(post: PostView) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    image: post.coverImage ? [absoluteUrl(post.coverImage)] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: SITE.parentCompany },
    publisher: { "@type": "Organization", name: SITE.parentCompany, logo: { "@type": "ImageObject", url: absoluteUrl("/images/brand/White-Logo-Green-BG-300x300.jpg") } },
    mainEntityOfPage: absoluteUrl(`/${post.slug}/`),
    description: post.excerpt ?? undefined,
  };
}
