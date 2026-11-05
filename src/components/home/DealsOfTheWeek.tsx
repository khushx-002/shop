/**
 * Punjabi Jeera banner + "Deals Of The Week" product carousel (old site: section 64f7b80e).
 * Desktop: left 24% = portrait juice banner with "Order Now!", right = white box with the title and
 * a product carousel (4 / 3 / 2 per view). Below 1024px the banner sits above the box as a short
 * wide card (top of the picture, so the face and the "Punjabi Jeera" logo stay visible) instead of a
 * lone button.
 *
 * Heritage look: a soft cream band with thin lines top and bottom, the banner and the carousel box
 * with 20px corners, a small gold label and a Playfair title. The product cards are the shared
 * ProductCard (styled in its own file). `background` (the old doodle picture) is no longer shown.
 */
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Carousel } from "@/components/ui/Carousel";
import { routes } from "@/lib/routes";
import type { ProductCardData } from "@/lib/types";

type Props = {
  title: string;
  background: string;
  juiceBanner: string;
  juiceButton: string;
  juiceHref: string;
  cards: ProductCardData[];
};

export function DealsOfTheWeek({ title, juiceBanner, juiceButton, juiceHref, cards }: Props) {
  return (
    <section aria-labelledby="deals-of-the-week" className="section border-y border-line bg-cream-light">
      <div className="wide-container flex flex-col gap-[20px] lg:flex-row lg:items-stretch">
        {/* Juice promo: the whole banner is clickable; the image repeats the button link for mouse users */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-gold/25 bg-[#F0E5D0] shadow-soft md:aspect-[2/1] lg:aspect-auto lg:min-h-[480px] lg:w-[24%] lg:shrink-0">
          <Link href={juiceHref} tabIndex={-1} aria-hidden="true" className="group absolute inset-0 block">
            <Image
              src={juiceBanner}
              alt="Jivo Wheatgrass Punjabi Jeera Juice"
              fill
              sizes="(max-width: 1023px) 94vw, 24vw"
              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 lg:object-center"
            />
          </Link>
          <Link href={juiceHref} className="btn btn-primary btn-pill absolute bottom-[16px] left-1/2 -translate-x-1/2 px-[28px] shadow-soft lg:bottom-[20px]">
            {juiceButton}
          </Link>
        </div>
        <div className="min-w-0 flex-1 rounded-[20px] border border-line bg-white px-[14px] pb-[18px] pt-[26px] shadow-soft md:px-[28px] md:pb-[28px] md:pt-[32px] lg:px-[36px]">
          <span className="eyebrow">This week&apos;s offers</span>
          <h2 id="deals-of-the-week" className="mt-[6px] font-heading text-[clamp(26px,3vw,36px)] font-bold leading-[1.15] text-primary">
            {title}
          </h2>
          <span aria-hidden="true" className="gold-line mt-[12px]" />
          {cards.length ? (
            <Carousel perView={{ base: 2, md: 3, lg: 4 }} gap={20} arrows label={title} className="mt-[28px]" slideClassName="pb-[24px] pt-[8px]" arrowClassName="max-md:h-9 max-md:w-9">
              {cards.map((card) => (
                <ProductCard key={card.key} card={card} variant="carousel" sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, 17vw" />
              ))}
            </Carousel>
          ) : (
            <p className="mt-[28px] text-body">
              There are no deals right now.{" "}
              <Link href={routes.shop} className="text-primary underline decoration-gold underline-offset-[3px] hover:text-gold-dark">
                Browse all products
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
