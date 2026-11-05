/**
 * "In The Spotlight": 4 hand-picked product cards (old site: Elementor containers a678885).
 * Image, title, stars + "4.58 | (238) ✓", live price and an "Add to cart" button.
 * When a product has nothing in stock the card shows the small "Notify when available" bar
 * (it opens the waiting-list form) and the bottom button links to the product page.
 *
 * Heritage look (same pattern as the new product card): white card, 20px corners, thin gold border,
 * soft shadow, lifts 4px on hover; cream gradient picture box with a thin inner gold frame;
 * Playfair title in green, gold stars, green price and a full-width green button.
 */
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WaitlistForm } from "@/components/product/WaitlistForm";
import { Price } from "@/components/ui/Price";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Stars } from "@/components/ui/Stars";
import type { SpotlightCard } from "@/components/home/data";

/** Small green tick shown after the rating text (the old cards used the ✅ emoji). */
function GreenCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-primary">
      <rect width="16" height="16" rx="4" fill="currentColor" />
      <path d="m3.6 8.4 2.9 2.9 5.9-6.3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "4.58 | (238)" -> words for screen readers ("Rated 4.58 out of 5, 238 reviews"). */
function ratingWords(text: string): string {
  const m = text.match(/([\d.]+)\s*\|\s*\((\d+)\)/);
  return m ? `Rated ${m[1]} out of 5, ${m[2]} reviews` : text;
}

function SpotlightItem({ card }: { card: SpotlightCard }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[16px] border border-gold/25 bg-white shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:rounded-[20px]">
      {/* Image repeats the title link for mouse users; hidden from keyboard/screen readers */}
      <Link
        href={card.href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block border-b border-gold/15 bg-gradient-to-br from-cream-light to-[#F0E5D0] p-[8px] md:p-[12px]"
      >
        <Image
          src={card.image.url}
          alt={card.image.alt}
          width={card.image.width}
          height={card.image.height}
          sizes="(max-width: 767px) 46vw, (max-width: 1169px) 23vw, 270px"
          className="block aspect-square w-full rounded-[10px] object-cover md:rounded-[13px]"
        />
        {/* thin inner gold frame */}
        <span className="pointer-events-none absolute inset-[8px] rounded-[10px] border border-gold/30 md:inset-[12px] md:rounded-[13px]" />
      </Link>
      <div className="flex flex-1 flex-col px-[12px] pb-[12px] pt-[12px] md:px-[18px] md:pb-[18px] md:pt-[16px]">
        <h3 className="font-heading text-[15px] font-bold capitalize leading-[1.3] text-primary md:text-[19px]">
          <Link href={card.href} className="transition-colors hover:text-gold-dark">
            {card.title}
          </Link>
        </h3>
        <div className="mt-[8px] flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
          <span aria-hidden="true" className="flex">
            <Stars rating={card.stars} size={15} className="[&_svg]:h-[12px] [&_svg]:w-[12px] md:[&_svg]:h-[15px] md:[&_svg]:w-[15px]" />
          </span>
          <span aria-hidden="true" className="flex items-center gap-[4px] text-[12px] leading-none text-muted md:text-[13px]">
            {card.ratingText}
            <GreenCheck />
          </span>
          <span className="sr-only">{ratingWords(card.ratingText)}</span>
        </div>
        {card.pack ? (
          <Price
            pricePaise={card.pack.pricePaise}
            regularPricePaise={card.pack.regularPricePaise}
            variant="spotlight"
            className="mt-[12px] pb-[14px] [&_del]:text-[12px] md:[&_del]:text-[14px] [&_span]:text-[18px] md:[&_span]:text-[22px]"
          />
        ) : (
          <WaitlistForm productId={card.productId} message={null} className="mt-[12px] pb-[14px]" />
        )}
        {/* Sold out: the same button as a "Read more" link to the product page (keeps the cards the same shape). */}
        <AddToCartButton
          variationId={card.pack?.variationId ?? null}
          href={card.href}
          inStock={!!card.pack}
          productName={card.pack ? `${card.productName} – ${card.pack.label}` : card.productName}
          label="Add to cart"
          className="btn btn-primary mt-auto w-full px-[10px] py-[11px] text-[13px] disabled:opacity-70 md:py-[13px] md:text-[14px]"
        />
      </div>
    </article>
  );
}

export function Spotlight({ title, subtitle, cards }: { title: string; subtitle: string; cards: SpotlightCard[] }) {
  if (!cards.length) return null;
  return (
    <section className="section">
      <div className="site-container">
        <SectionTitle eyebrow="Bestsellers" title={title} subtitle={subtitle} />
        <div className="mt-[32px] grid grid-cols-2 gap-[10px] md:mt-[44px] md:grid-cols-4 md:gap-[20px]">
          {cards.map((card) => (
            <SpotlightItem key={card.key} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
