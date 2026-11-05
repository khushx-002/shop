/**
 * Loads everything one product page needs (server only, from the cached catalog).
 *
 * Images from product.content are checked against src/content/image-sizes.json: an image with
 * no known size is one that failed to download from the old site (the file is really an HTML
 * error page), so it is left out instead of showing a broken picture.
 */
import "server-only";
import { getProductBySlug, getProductReviews, getProductsBySlugs, imageSize, productCard } from "@/lib/catalog";
import type { ProductCardData, ProductDetail, ReviewSummary, ReviewView } from "@/lib/types";
import type { SizedImage } from "@/components/product/ProductSections";

export type ProductMedia = {
  trustStrip: SizedImage | null;
  newsBanner: SizedImage | null;
  newsLogos: SizedImage[];
  videos: string[];
  reasonsDesktop: SizedImage | null;
  reasonsMobile: SizedImage | null;
  cooking: { image: SizedImage; label: string }[];
  comparison: { heading: string; usImage: SizedImage | null; us: string[]; othersHeading: string; othersImage: SizedImage | null; others: string[] } | null;
  comparisonImage: SizedImage | null;
  stories: { text: string; name: string; source?: string; image: SizedImage | null }[];
};

export type ProductPageData = {
  product: ProductDetail;
  media: ProductMedia;
  reviews: ReviewView[];
  summary: ReviewSummary;
  fbt: ProductCardData[];
  related: ProductCardData[];
};

/** A content image with its size, or null when the path is empty, not a string or the file is broken. */
export function sized(url: unknown): SizedImage | null {
  if (typeof url !== "string" || !url) return null;
  const s = imageSize(url);
  return s ? { url, width: s.width, height: s.height } : null;
}

function strings(list: unknown): string[] {
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

function buildMedia(p: ProductDetail): ProductMedia {
  const c = p.content;
  const cmp = c.comparison;
  return {
    trustStrip: sized(c.trustStrip),
    newsBanner: sized(c.newsBanner),
    newsLogos: strings(c.newsLogos)
      .map(sized)
      .filter((x): x is SizedImage => !!x),
    videos: strings(c.videos).filter((v) => /\.(mp4|webm)$/i.test(v)),
    reasonsDesktop: sized(c.reasonsImageDesktop),
    reasonsMobile: sized(c.reasonsImageMobile),
    cooking: (c.cookingImages ?? []).flatMap((x) => {
      const image = sized(x.image);
      return image ? [{ image, label: x.label }] : [];
    }),
    comparison:
      cmp && (cmp.us?.length || cmp.others?.length)
        ? { heading: cmp.heading || "Why We're The Best!", usImage: sized(cmp.usImage), us: strings(cmp.us), othersHeading: cmp.othersHeading || "Other Brands", othersImage: sized(cmp.othersImage), others: strings(cmp.others) }
        : null,
    comparisonImage: sized(c.comparisonImage),
    stories: (c.stories ?? []).filter((s) => s && s.text && s.name).map((s) => ({ text: s.text, name: s.name.split("<")[0].trim(), source: s.source, image: sized(s.image) })),
  };
}

async function cardsFor(slugs: unknown, self: ProductDetail): Promise<ProductCardData[]> {
  const list = await getProductsBySlugs(strings(slugs));
  return list.filter((x) => x.id !== self.id && x.visible).map(productCard);
}

export async function loadProductPage(slug: string): Promise<ProductPageData | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  const [{ reviews, summary }, fbt, related] = await Promise.all([
    getProductReviews(product.id),
    product.template === "standard" ? cardsFor(product.content.fbt, product) : Promise.resolve([]),
    product.template === "standard" ? cardsFor(product.content.related, product) : Promise.resolve([]),
  ]);
  return { product, media: buildMedia(product), reviews, summary, fbt, related };
}
