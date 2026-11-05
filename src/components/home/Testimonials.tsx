/**
 * "Testimonials": customer quotes (old site: yellow section b4bb13f). Carousel: 3 per view on
 * desktop (centred, looped), 1 on smaller screens, gold pill dots.
 *
 * Heritage look: cream section; white review cards with a thin warm border and 16px corners,
 * a big gold Playfair quote mark, gold stars, the quote, and the customer photo with a muted name.
 * `background` (the old yellow from home.json) is still accepted but no longer shown.
 */
import Image from "next/image";
import { Carousel } from "@/components/ui/Carousel";
import { SectionTitle } from "@/components/ui/SectionTitle";

type Testimonial = { text: string; name: string; image: string };

/** One old record has HTML glued to the name ("Kanika Singh <div class=…"); keep only the name. */
function cleanName(name: string): string {
  return name.split("<")[0].trim();
}

/** 5 solid gold stars. */
function FiveStars() {
  return (
    <span role="img" aria-label="Rated 5 out of 5" className="flex gap-[2px] text-gold">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8Z" />
        </svg>
      ))}
    </span>
  );
}

export function Testimonials({ title, subtitle, items }: { title: string; subtitle: string; items: Testimonial[]; background?: string }) {
  if (!items.length) return null;
  return (
    <section className="section bg-cream">
      <div className="site-container">
        <SectionTitle eyebrow="Customer love" title={title} subtitle={subtitle} />
        <Carousel perView={{ base: 1, lg: 3 }} gap={20} loop dots align="center" label={title} className="mt-[32px] md:mt-[44px]" dotsClassName="mt-[26px]">
          {items.map((t) => {
            const name = cleanName(t.name);
            return (
              <figure key={name} className="card-soft relative mx-auto flex h-full max-w-[640px] flex-col px-[24px] pb-[24px] pt-[22px] text-left md:px-[28px]">
                <div className="flex items-start justify-between gap-[12px]">
                  <span aria-hidden="true" className="-mb-[18px] font-heading text-[72px] font-bold leading-[0.9] text-gold">
                    &ldquo;
                  </span>
                  <span className="pt-[8px]">
                    <FiveStars />
                  </span>
                </div>
                <blockquote className="mb-[20px] mt-[8px]">
                  <p className="text-[16px] leading-[1.7] text-body">{t.text}</p>
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-[12px] border-t border-line pt-[16px]">
                  <Image src={t.image} alt="" width={300} height={300} sizes="48px" className="block h-[48px] w-[48px] shrink-0 rounded-full border-2 border-gold/40 object-cover" />
                  <span className="text-[15px] font-bold capitalize leading-[1.3] text-muted">{name}</span>
                </figcaption>
              </figure>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}
