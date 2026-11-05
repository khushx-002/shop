/**
 * "Standard" product template (20 products, e.g. /product/jivo-extra-virgin-coconut-oil/).
 * Layout of the old XStore single-product page, in the heritage look (cream picture box, Playfair
 * title, pack pills, green buttons; sections alternate white / cream-light). The fake "6 items sold in last 3 hours" and
 * "54 people are viewing" counters are deliberately not shown (misleading urgency).
 */
import Link from "next/link";
import { BackLink } from "@/components/catalog/BackLink";
import { ProductCard } from "@/components/product/ProductCard";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductTabs, type TabItem } from "@/components/product/ProductTabs";
import { ClaimsMarquee, CustomerStories, SafeCheckout } from "@/components/product/ProductSections";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { ScriptHeading } from "@/components/product/ScriptHeading";
import { StickyAddToCart } from "@/components/product/StickyAddToCart";
import type { ProductPageData } from "@/components/product/page-data";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Carousel } from "@/components/ui/Carousel";
import { RichText } from "@/components/ui/RichText";
import { Stars } from "@/components/ui/Stars";
import { routes } from "@/lib/routes";

export function StandardProduct({ data, crumbs }: { data: ProductPageData; crumbs: Crumb[] }) {
  const { product: p, media, reviews, summary, fbt, related } = data;
  const c = p.content;
  const anchorId = `buy-${p.id}`;
  const category = p.categories[0];

  const tabs: TabItem[] = [];
  if (p.descriptionHtml) tabs.push({ key: "description", label: "Description", content: <RichText html={p.descriptionHtml} /> });
  if (p.additionalInfo.length) {
    tabs.push({
      key: "additional",
      label: "Additional information",
      content: (
        <table className="w-full border-collapse text-left text-[15px]">
          <tbody>
            {p.additionalInfo.map(([k, v]) => (
              <tr key={k} className="border-b border-line">
                <th scope="row" className="w-[30%] py-[12px] pr-4 font-semibold text-primary">
                  {k}
                </th>
                <td className="py-[12px]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    });
  }
  if (p.disclaimerHtml) tabs.push({ key: "disclaimer", label: "Disclaimer", content: <RichText html={p.disclaimerHtml} /> });

  return (
    <>
      <div className="bg-[linear-gradient(180deg,var(--color-cream-light)_0%,#ffffff_520px)] pb-[48px] md:pb-[64px]">
        <div className="mx-auto max-w-[1440px] px-[15px] pt-[20px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Breadcrumbs items={crumbs} />
            <span className="hidden md:block">
              <BackLink />
            </span>
          </div>

          {/* Like the old site: picture on top and the info below up to 1024px (tablet), 2 columns above that. */}
          <div className="mt-[20px] grid gap-x-[48px] md:mt-[28px] min-[1025px]:grid-cols-2">
            <div className="min-w-0">
              <ProductGallery images={p.images} productName={p.name} variant="standard" />
            </div>

            <div className="mt-[24px] min-w-0 md:mt-[40px] min-[1025px]:mt-0">
              {category && (
                <Link href={routes.category(category.slug)} className="eyebrow mb-[10px] w-fit transition-colors hover:text-primary">
                  {category.name}
                </Link>
              )}
              <h1 className="font-heading text-[30px] font-bold leading-[1.15] text-primary md:text-[34px] lg:text-[40px]">{p.name}</h1>
              <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
                {p.ratingAvg > 0 && (
                  <>
                    <Stars rating={p.ratingAvg} size={18} />
                    <span className="text-[15px] text-body">{p.ratingAvg.toFixed(1)} (Avg. Rating)</span>
                  </>
                )}
                <WishlistButton
                  productId={p.id}
                  productName={p.name}
                  className="ml-[6px] flex h-[40px] w-[40px] items-center justify-center rounded-full border border-gold/35 bg-white text-primary shadow-soft transition-colors hover:border-gold hover:text-gold-dark"
                />
              </div>
              {p.estimatedDelivery && p.inStock && (
                <p className="mt-[16px] rounded-[8px] border-l-[3px] border-gold bg-[#f3eadb] px-[14px] py-[10px] text-[15px] font-semibold text-ink">
                  Estimated delivery: <span className="font-normal text-body">{p.estimatedDelivery}</span>
                </p>
              )}
              {p.shortDescriptionHtml && <RichText html={p.shortDescriptionHtml} className="mt-[20px] text-[15px] leading-[1.65] text-body [&_p]:mb-[10px]" />}

              <div className="mt-[24px] border-t border-line pt-[24px]">
                <PurchasePanel variant="standard" attributeName={p.attributeName} anchorId={anchorId} />
              </div>
              <SafeCheckout />
            </div>
          </div>
        </div>
      </div>

      <ClaimsMarquee claims={c.claims ?? []} />

      {fbt.length > 0 && (
        <section aria-labelledby="fbt-title" className="bg-cream-light px-[15px] py-[48px] md:py-[72px]">
          <ScriptHeading id="fbt-title" title="Frequently Bought Together" className="mx-auto max-w-[1140px]" />
          <ul className="mx-auto mt-[32px] grid max-w-[1440px] grid-cols-2 gap-[14px] md:grid-cols-3 md:gap-[20px] lg:grid-cols-4">
            {fbt.map((card) => (
              <li key={card.key}>
                <ProductCard card={card} variant="carousel" sizes="(max-width: 767px) 50vw, (max-width: 1024px) 33vw, 340px" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CustomerStories heading={c.storiesHeading || "Customer Stories"} subheading={c.storiesSubheading || "Over 5 Lakh+ customers trust Jivo for their family’s health"} stories={media.stories} variant="standard" />

      {tabs.length > 0 && (
        <section aria-label="Product details" className="bg-cream-light px-[15px] py-[48px] md:py-[64px]">
          <div className="card-soft mx-auto max-w-[1170px] px-[16px] md:px-[40px]">
            <ProductTabs tabs={tabs} />
          </div>
        </section>
      )}

      <div id="reviews" className="scroll-mt-[90px]">
        <ProductReviews productId={p.id} productName={p.name} reviews={reviews} summary={summary} subtitle="Your Feedback Fuels Our Improvement" />
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="bg-cream-light px-[15px] py-[48px] md:py-[72px]">
          <ScriptHeading id="related-title" title="Related Products" />
          {/* slide padding: room for the card's 4px hover lift and its soft shadow inside the clipped track */}
          <Carousel perView={{ base: 2, md: 3, lg: 4 }} gap={16} arrows label="Related products" className="mx-auto mt-[28px] max-w-[1170px]" slideClassName="pb-[24px] pt-[8px]">
            {related.map((card) => (
              <ProductCard key={card.key} card={card} variant="carousel" sizes="(max-width: 767px) 50vw, (max-width: 1024px) 33vw, 270px" />
            ))}
          </Carousel>
        </section>
      )}

      {p.inStock && <StickyAddToCart anchorId={anchorId} image={p.images[0]?.url ?? null} attributeName={p.attributeName} />}
    </>
  );
}
