/**
 * "Our Core Tenets": 3 value cards (old site: teal section ee1f408 with 3 icon boxes).
 * Desktop: 3 cards in a row with a small gold arrow between them; phones and tablets: a 1-per-view
 * carousel with gold pill dots.
 *
 * Heritage look (reference "journey"): light warm band with thin lines top and bottom, white cards
 * with 16px corners, a big gold Playfair number (01 / 02 / 03), the old icon (recoloured green) in a
 * cream circle, a green Playfair title and normal body text.
 * `background` (the old teal from home.json) is still accepted but no longer shown.
 */
import Image, { type StaticImageData } from "next/image";
import { Carousel } from "@/components/ui/Carousel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import intelligence from "@/components/home/icons/tenet-intelligence.svg";
import nutrition from "@/components/home/icons/tenet-nutrition.svg";
import everyone from "@/components/home/icons/tenet-everyone.svg";

const ICONS: StaticImageData[] = [intelligence, nutrition, everyone];

type Tenet = { title: string; text: string };

function TenetBox({ tenet, icon, index }: { tenet: Tenet; icon: StaticImageData | undefined; index: number }) {
  return (
    <div className="card-soft flex h-full flex-col p-[24px] text-left shadow-soft min-[1025px]:p-[30px]">
      <div className="flex items-center justify-between gap-[16px]">
        <span aria-hidden="true" className="font-heading text-[44px] font-bold leading-none text-gold min-[1025px]:text-[52px]">
          {String(index + 1).padStart(2, "0")}
        </span>
        {icon && (
          <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border border-gold/25 bg-cream">
            <Image src={icon} alt="" width={36} height={36} className="h-[36px] w-[36px]" />
          </span>
        )}
      </div>
      <span aria-hidden="true" className="gold-line mt-[18px]" />
      <h3 className="mt-[16px] font-heading text-[21px] font-bold leading-[1.25] text-primary min-[1025px]:text-[23px]">{tenet.title}</h3>
      <p className="mt-[10px] text-[15px] leading-[1.7] text-body">{tenet.text}</p>
    </div>
  );
}

export function CoreTenets({ title, items }: { title: string; items: Tenet[]; background?: string }) {
  if (!items.length) return null;
  return (
    <section className="section border-y border-line bg-[#fff8ec]">
      <div className="site-container">
        <SectionTitle eyebrow="What we stand for" title={title} />
        <ul className="mt-[44px] hidden grid-cols-3 gap-[44px] min-[1025px]:grid">
          {items.map((tenet, i) => (
            <li key={tenet.title} className="relative">
              <TenetBox tenet={tenet} icon={ICONS[i]} index={i} />
              {i < items.length - 1 && (
                <span aria-hidden="true" className="absolute -right-[33px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center text-[20px] leading-none text-gold">
                  →
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-[32px] max-w-[640px] min-[1025px]:hidden">
          <Carousel perView={{ base: 1 }} gap={16} loop dots label={title} dotsClassName="mt-[22px]">
            {items.map((tenet, i) => (
              <TenetBox key={tenet.title} tenet={tenet} icon={ICONS[i]} index={i} />
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
