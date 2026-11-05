/**
 * "Rich" landing-page template (12 oil/ghee products, e.g. /product/jivo-rice-bran-oil/).
 * Section order follows the old Elementor page. Some sections exist only on phones/tablets
 * (cooking carousel, comparison lists) or only on desktop (comparison infographic), like before.
 */
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Stars } from "@/components/ui/Stars";
import { ExpandableDescription } from "@/components/product/ExpandableDescription";
import { ProductFaq } from "@/components/product/ProductFaq";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductReviews } from "@/components/product/ProductReviews";
import {
  BenefitCards,
  BenefitList,
  ClaimsMarquee,
  ComparisonBlock,
  ComparisonImage,
  CookingCarousel,
  CustomerStories,
  InTheNews,
  Reasons,
  StatBoxes,
} from "@/components/product/ProductSections";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { VideoReels } from "@/components/product/VideoReels";
import type { ProductPageData } from "@/components/product/page-data";
import { routes } from "@/lib/routes";

export function RichProduct({ data, crumbs }: { data: ProductPageData; crumbs: Crumb[] }) {
  const { product: p, media, reviews, summary } = data;
  const c = p.content;
  const category = p.categories[0];

  return (
    <>
      {/* ---------------- product info (soft cream gradient) ---------------- */}
      <section className="bg-[linear-gradient(180deg,var(--color-cream)_0%,var(--color-cream-light)_55%,#ffffff_100%)] pb-[48px] lg:pb-[64px]">
        <div className="mx-auto max-w-[1440px] px-[10px] pb-[30px] pt-[20px] md:px-[58px] md:pb-[40px] md:pt-[50px]">
          <Breadcrumbs items={crumbs} />
        </div>
        <div className="mx-auto grid max-w-[1330px] gap-x-[48px] md:grid-cols-2 md:px-[45px] lg:px-[50px]">
          <div className="min-w-0 px-[10px] md:px-0">
            <ProductGallery images={p.images} productName={p.name} variant="rich" />
            {media.trustStrip && (
              <Image
                src={media.trustStrip.url}
                alt="FSSAI, GMP certified, Non-GMO, Clean label, Make in India"
                width={media.trustStrip.width}
                height={media.trustStrip.height}
                sizes="481px"
                className="mx-auto mt-[40px] hidden h-auto w-[80%] max-w-[481px] md:block"
                loading="lazy"
              />
            )}
          </div>

          <div className="mt-[30px] flex min-w-0 flex-col md:mt-0">
            {/* phones: name first, then the tagline pill */}
            {p.tagline && (
              <p className="order-2 mx-[13px] mt-[14px] max-w-[440px] rounded-[8px] border-l-[3px] border-gold bg-[#f3eadb] px-[16px] py-[10px] text-[15px] leading-[1.6] text-ink md:order-1 md:mx-0 md:mt-0">
                {p.tagline}
              </p>
            )}
            <div className="order-1 mx-[13px] md:order-2 md:mx-0 md:mt-[22px]">
              {category && (
                <Link href={routes.category(category.slug)} className="eyebrow mb-[10px] w-fit transition-colors hover:text-primary">
                  {category.name}
                </Link>
              )}
              <h1 className="font-heading text-[30px] font-bold leading-[1.15] text-primary md:text-[34px] lg:text-[40px]">{p.name}</h1>
            </div>
            <div className="order-3 mx-[13px] mt-[12px] flex flex-wrap items-center gap-[6px] text-[14px] text-body md:mx-0">
              {p.ratingAvg > 0 && <Stars rating={p.ratingAvg} size={16} />}
              {p.ratingText && (
                <>
                  <a href="#reviews" className="ml-[2px] text-[14px] font-bold text-primary underline decoration-gold/60 underline-offset-4 hover:text-gold-dark">
                    {p.ratingText}
                  </a>
                  <span>Reviews |</span>
                </>
              )}
              {p.unitsSoldText && (
                <>
                  <b className="text-[14px] text-ink">{p.unitsSoldText}</b>
                  <span>
                    Units Sold <span aria-hidden="true">🔥</span>
                  </span>
                </>
              )}
            </div>

            <div className="order-4">
              {p.descriptionHtml && <ExpandableDescription html={p.descriptionHtml} className="mt-[24px] md:mt-[40px] md:px-0 [&>div:first-child]:px-[23px] md:[&>div:first-child]:px-0" />}
              {c.benefits && c.benefits.length > 0 && (
                <div className="mt-[22px] md:mt-[26px]">
                  <BenefitList items={c.benefits} tone={p.slug.includes("ghee") ? "ghee" : "default"} />
                </div>
              )}
              {c.statBoxes && c.statBoxes.length > 0 && <StatBoxes items={c.statBoxes} />}
              <div className="mt-[24px]">
                <PurchasePanel variant="rich" attributeName={p.attributeName} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <InTheNews banner={media.newsBanner} logos={media.newsLogos} />
      <VideoReels videos={media.videos} />
      {c.benefitCards && c.benefitCards.length > 0 && <BenefitCards heading={c.benefitsHeading || "Follow Your Heart to a Healthy Life"} cards={c.benefitCards} />}
      <Reasons heading={c.reasonsHeading || ""} desktop={media.reasonsDesktop} mobile={media.reasonsMobile} />

      {/* phones/tablets only (desktop shows the same content in one infographic below) */}
      <CookingCarousel heading={c.cookingHeading || "Healthy Food With Great Taste!"} items={media.cooking} className={media.comparisonImage ? "lg:hidden" : ""} />
      {media.comparison && <ComparisonBlock data={media.comparison} className={media.comparisonImage ? "lg:hidden" : ""} />}

      <ClaimsMarquee claims={c.claims ?? []} />
      <CustomerStories heading={c.storiesHeading || "Customer Stories"} subheading={c.storiesSubheading || "Over 5 Lakh+ customers trust Jivo for their family’s health"} stories={media.stories} variant="rich" />
      {media.comparisonImage && <ComparisonImage image={media.comparisonImage} alt={`${c.cookingHeading || "Healthy Food With Great Taste!"} ${media.comparison?.heading ?? "Why We're The Best!"}`} />}

      {c.faqs && c.faqs.length > 0 && <ProductFaq heading={c.faqHeading || "Got questions? We've got answers"} tabs={c.faqTabs ?? []} faqs={c.faqs} />}

      <div id="reviews" className="scroll-mt-[90px]">
        <ProductReviews productId={p.id} productName={p.name} reviews={reviews} summary={summary} />
      </div>
    </>
  );
}
