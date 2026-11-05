/**
 * Content sections below the product info (structure of the old Elementor product pages), in the
 * heritage look: Playfair headings with a gold line, sections alternating white / cream-light,
 * white bordered cards with gold icons. Server components; the carousels are the shared <Carousel>.
 *
 * Image paths come from product.content. Some old images were never downloaded correctly
 * (they are HTML error pages saved with an image name); the page passes only images that
 * have a known size (see validImage() in the page), and sections hide when their image is missing.
 */
import Image from "next/image";
import benefitCard1 from "@/components/product/icons/benefit-card-1.svg";
import benefitCard2 from "@/components/product/icons/benefit-card-2.svg";
import benefitCard3 from "@/components/product/icons/benefit-card-3.svg";
import { BENEFIT_ICONS, type BenefitIconName } from "@/components/product/benefit-icons";
import { ScriptHeading } from "@/components/product/ScriptHeading";
import { TRUST_ICONS } from "@/components/product/trust-icons";
import { Carousel } from "@/components/ui/Carousel";
import { Marquee } from "@/components/ui/Marquee";

export type SizedImage = { url: string; width: number; height: number };

/** section spacing (48px phones, 72px desktop), like the shared .section class */
const SECTION = "py-[48px] md:py-[72px]";
/** turns the orange (#f8aa18) circle of the benefit-card icons into the theme gold */
const GOLD_ICON = "brightness-[.78] saturate-[.7]";

/* ------------------------------------------------------------------ benefits next to the price */

function pickBenefitIcon(text: string, index: number): BenefitIconName | "chart" {
  const t = text.toLowerCase();
  if (/cholesterol|blood/.test(t)) return "chart";
  if (/brain/.test(t)) return "brain";
  if (/cancer|bacteria|gluten|lactose/.test(t)) return "bacteria";
  if (/weight|bone/.test(t)) return "weight";
  if (/radical|antioxidant|tocopherol/.test(t)) return "snowflake";
  if (/absorb|nutrient|omega|mufa|pufa|natural|vitamin/.test(t)) return "cannabis";
  return (["bacteria", "brain", "chart", "cannabis", "weight", "snowflake"] as const)[index % 6];
}

/** Icons of the ghee pages (old Elementor icon boxes: nutritionix, medrt, level-down, hand-holding-heart, bone, brain). */
function pickGheeIcon(text: string, index: number): BenefitIconName {
  const t = text.toLowerCase();
  if (/lactose|gluten/.test(t)) return "nutritionix";
  if (/nutrient/.test(t)) return "medrt";
  if (/cholesterol/.test(t)) return "level-down-alt";
  if (/heart/.test(t)) return "hand-holding-heart";
  if (/bone/.test(t)) return "bone";
  if (/brain/.test(t)) return "brain";
  return (["nutritionix", "medrt", "level-down-alt", "hand-holding-heart", "bone", "brain"] as const)[index % 6];
}

function BenefitIcon({ name }: { name: BenefitIconName | "chart" }) {
  if (name === "chart") {
    return (
      <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden="true" fill="currentColor">
        <path d="M32 448h448v32H32zM64 304h80v128H64zm128-96h80v224h-80zm128-128h80v352h-80z" />
      </svg>
    );
  }
  const icon = BENEFIT_ICONS[name];
  return (
    <svg viewBox={icon.viewBox} width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d={icon.d} />
    </svg>
  );
}

/**
 * The 6 icon + text bullets on the rich page: cream round icon with a gold border and gold glyph,
 * or on the ghee pages (`tone="ghee"`) a filled gold round icon with a white glyph.
 */
export function BenefitList({ items, tone = "default" }: { items: string[]; tone?: "default" | "ghee" }) {
  if (!items.length) return null;
  const ghee = tone === "ghee";
  return (
    <ul className="grid grid-cols-2 gap-x-[4%] gap-y-[14px] px-4 md:gap-y-[16px]">
      {items.map((b, i) => (
        <li key={b} className="flex items-center gap-[12px] md:gap-[14px]">
          <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full md:h-[40px] md:w-[40px] ${ghee ? "bg-gold text-white" : "border border-gold/35 bg-cream text-gold-dark"}`}>
            <BenefitIcon name={ghee ? pickGheeIcon(b, i) : pickBenefitIcon(b, i)} />
          </span>
          <span className="text-[14px] font-semibold leading-[1.3] text-ink md:text-[15px]">{b}</span>
        </li>
      ))}
    </ul>
  );
}

/** "#1 Top seller in India" style boxes in one white card: first word big (Playfair, green), rest small, thin gold dividers. */
export function StatBoxes({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="card-soft mx-4 mt-[22px] grid grid-cols-2 gap-y-[14px] px-[6px] py-[16px] md:mx-0 md:mt-[30px] md:grid-cols-4">
      {items.map((s, i) => {
        const [big, ...rest] = s.split(" ");
        return (
          <li
            key={s}
            className={`flex flex-col items-center px-1 text-center ${i % 2 === 0 ? "border-r border-gold/30" : ""} md:border-r md:border-gold/30 ${i === items.length - 1 ? "md:border-r-0" : ""}`}
          >
            <span className="font-heading text-[26px] font-bold leading-[1.1] text-primary md:text-[30px]">{big}</span>
            <span className="mt-[4px] text-[14px] font-semibold leading-[1.3] text-muted md:text-[13px]">{rest.join(" ")}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ in the news */

export function InTheNews({ banner, logos }: { banner: SizedImage | null; logos: SizedImage[] }) {
  if (!banner && !logos.length) return null;
  return (
    <section aria-label="In the news" className="border-t border-line bg-cream-light py-[32px] md:py-[48px]">
      {banner && (
        <div className={`mx-auto max-w-[1250px] px-[20px] ${logos.length ? "hidden lg:block" : ""}`}>
          <Image src={banner.url} alt="Jivo in the news: The Hindu, Business Standard, YourStory, NuFFooDS Spectrum" width={banner.width} height={banner.height} sizes="(max-width: 1250px) 100vw, 1250px" className="h-auto w-full" />
        </div>
      )}
      {logos.length > 0 && (
        <div className={banner ? "lg:hidden" : ""}>
          <ScriptHeading title="In The News" />
          <Marquee
            label="Newspapers and magazines that wrote about Jivo"
            separator={null}
            durationSec={20}
            className="mt-[20px]"
            items={logos.map((l) => (
              <Image key={l.url} src={l.url} alt="" width={l.width} height={l.height} sizes="200px" className="h-[46px] w-auto mix-blend-multiply md:h-[60px]" loading="lazy" />
            ))}
          />
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ follow your heart (benefit cards) */

const CARD_ICONS = [benefitCard1, benefitCard2, benefitCard3];

export function BenefitCards({ heading, cards }: { heading: string; cards: { title: string; text: string }[] }) {
  if (!cards.length) return null;
  return (
    <section aria-label={heading} className={`bg-cream-light ${SECTION}`}>
      <ScriptHeading title={heading} className="mx-[16px]" />
      <div className="mx-auto mt-[32px] max-w-[1240px] px-[10px] md:mt-[44px] md:px-[5%]">
        {/* phones/tablets: one card at a time with gold arrows on the sides (the 30px side padding keeps them off the card) */}
        <Carousel perView={{ base: 1, md: 1, lg: 3 }} gap={20} arrows loop label={heading} arrowClassName="bg-transparent! border-0! shadow-none! text-gold-dark! hover:text-primary! lg:hidden">
          {cards.map((c, i) => (
            <div key={c.title} className="h-full px-[30px] lg:px-0">
              <div className="card-soft flex h-full flex-col items-center px-[22px] py-[28px] text-center md:px-[28px]">
                <Image src={CARD_ICONS[i % CARD_ICONS.length]} alt="" width={140} height={140} className={`h-[88px] w-[88px] md:h-[72px] md:w-[72px] ${GOLD_ICON}`} loading="lazy" unoptimized />
                <h3 className="mt-[18px] font-heading text-[20px] font-bold capitalize leading-[1.25] text-primary md:text-[22px]">{c.title}</h3>
                <span aria-hidden="true" className="gold-line mx-auto mt-[12px]" />
                <p className="mt-[12px] text-[15px] leading-[1.65] text-body">{c.text}</p>
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 6 reasons */

export function Reasons({ heading, desktop, mobile }: { heading: string; desktop: SizedImage | null; mobile: SizedImage | null }) {
  if (!desktop && !mobile) return null;
  return (
    <section aria-label={heading} className={`bg-white ${SECTION}`}>
      {heading && <ScriptHeading title={heading} className="mx-auto max-w-[680px] px-[16px]" />}
      <div className="mx-auto mt-[28px] max-w-[1100px] px-[10px]">
        {desktop && (
          <Image src={desktop.url} alt={heading} width={desktop.width} height={desktop.height} sizes="(max-width: 1100px) 100vw, 1100px" className={`h-auto w-full ${mobile ? "hidden lg:block" : ""}`} />
        )}
        {mobile && (
          <Image src={mobile.url} alt={heading} width={mobile.width} height={mobile.height} sizes="(max-width: 767px) 92vw, 420px" className={`mx-auto h-auto w-full max-w-[420px] ${desktop ? "lg:hidden" : ""}`} />
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ healthy food (phones/tablets) */

export function CookingCarousel({ heading, items, className = "" }: { heading: string; items: { image: SizedImage; label: string }[]; className?: string }) {
  if (!items.length) return null;
  return (
    <section
      aria-label={heading}
      className={`relative overflow-hidden bg-[linear-gradient(180deg,var(--color-primary)_0%,var(--color-primary)_160px,var(--color-cream-light)_160px)] pb-[32px] md:bg-[linear-gradient(180deg,var(--color-primary)_0%,var(--color-primary)_165px,var(--color-cream-light)_165px)] ${className}`}
    >
      <h2 className="px-[10px] pb-[34px] pt-[42px] text-center font-heading text-[24px] font-bold leading-[1.15] text-white md:pb-[36px] md:pt-[45px] md:text-[30px]">{heading}</h2>
      <div className="px-[20px] md:px-[10px]">
        <Carousel perView={{ base: 1, md: 3 }} gap={20} loop autoplayMs={3500} label={heading}>
          {items.map((c) => (
            <figure key={c.label} className="text-center">
              <Image src={c.image.url} alt={c.label} width={c.image.width} height={c.image.height} sizes="(max-width: 767px) 90vw, 33vw" className="aspect-square h-auto w-full rounded-[16px] border border-gold/20 object-cover" loading="lazy" />
              <figcaption className="mt-[10px] text-[13px] font-bold uppercase tracking-[0.12em] text-primary">{c.label}</figcaption>
            </figure>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ why we're the best */

type Comparison = { heading: string; usImage: SizedImage | null; us: string[]; othersHeading: string; othersImage: SizedImage | null; others: string[] };

function TickList({ items }: { items: string[] }) {
  return (
    <ul className="mt-[30px] space-y-[20px] text-left first:mt-0">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-[12px] text-[15px] font-semibold leading-[1.6] text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="mt-[2px] shrink-0 text-gold">
            <path d="m3.5 13 5.5 5.5L21 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function ComparisonBlock({ data, className = "" }: { data: Comparison; className?: string }) {
  return (
    <section aria-label={data.heading} className={`bg-white px-[24px] ${SECTION} ${className}`}>
      <ScriptHeading title={data.heading} />
      <div className="card-soft mx-auto mt-[28px] grid max-w-[1000px] gap-[30px] px-[20px] py-[28px] lg:grid-cols-2 lg:gap-[60px]">
        <div>
          {data.usImage && <Image src={data.usImage.url} alt="Jivo oil" width={data.usImage.width} height={data.usImage.height} sizes="200px" className="mx-auto h-auto w-[170px]" loading="lazy" />}
          <TickList items={data.us} />
        </div>
        <div className="border-t border-gold/30 pt-[30px] lg:border-l lg:border-t-0 lg:pl-[60px] lg:pt-0">
          <h3 className="text-center font-heading text-[22px] font-bold text-primary">{data.othersHeading}</h3>
          {data.othersImage && <Image src={data.othersImage.url} alt="Other brand's oil (blurred)" width={data.othersImage.width} height={data.othersImage.height} sizes="200px" className="mx-auto mt-[20px] h-auto w-[170px]" loading="lazy" />}
          <TickList items={data.others} />
        </div>
      </div>
    </section>
  );
}

/**
 * Desktop infographic (Healthy food + Why we're the best in one picture, 1000px wide).
 * Like the old page, the coloured "Healthy Food" band runs across the full page width: the strip
 * behind the picture is filled with the picture's own top-left colour (green, or maroon/yellow on
 * some oils) by blowing up its corner pixel, so no colour list is needed. The band is the top 30%
 * of every infographic (300px at 1000px wide). `unoptimized` keeps one URL, so it downloads once.
 */
export function ComparisonImage({ image, alt }: { image: SizedImage; alt: string }) {
  return (
    <section aria-label={alt} className="relative hidden bg-white lg:block">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[300px] bg-no-repeat [background-position:0_0] [background-size:100000%_auto]"
        style={{ backgroundImage: `url("${image.url}")` }}
      />
      <div className="relative mx-auto max-w-[1000px]">
        <Image src={image.url} alt={alt} width={image.width} height={image.height} sizes="1000px" unoptimized className="h-auto w-full" loading="lazy" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ claims marquee */

export function ClaimsMarquee({ claims }: { claims: string[] }) {
  if (!claims.length) return null;
  return (
    <div className="bg-primary py-[14px] text-white">
      <Marquee
        label="Product benefits"
        items={claims}
        durationSec={Math.max(30, claims.length * 4)}
        itemClassName="text-[14px] font-semibold uppercase tracking-[0.14em] md:text-[15px]"
        separatorClassName="text-[16px] text-gold-light"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ customer stories */

type Story = { text: string; name: string; source?: string; image: SizedImage | null };

export function CustomerStories({ heading, subheading, stories, variant }: { heading: string; subheading: string; stories: Story[]; variant: "rich" | "standard" }) {
  if (!stories.length) return null;
  const bubble = variant === "standard";
  return (
    <section aria-label={heading} className={`bg-white ${SECTION}`}>
      <div className={`mx-auto ${bubble ? "max-w-[1440px] px-[15px]" : "max-w-none"}`}>
        <ScriptHeading title={heading} subtitle={subheading} large className={bubble ? "mx-auto max-w-[1140px]" : ""} />
        <Carousel
          perView={{ base: 1, md: 2, lg: 4 }}
          gap={bubble ? 50 : 40}
          loop
          dots
          autoplayMs={5000}
          align={bubble ? "start" : "center"}
          label={heading}
          className={`mt-[40px] ${bubble ? "lg:px-[65px]" : ""}`}
          dotsClassName="mt-[30px]"
        >
          {stories.map((s) => (
            <figure key={s.name + s.text.slice(0, 10)} className="flex h-full flex-col items-center text-center">
              <blockquote
                className={`${
                  bubble
                    ? "relative rounded-[16px] border border-line bg-cream-light px-[22px] py-[22px] after:absolute after:-bottom-[8px] after:left-1/2 after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[8px] after:border-t-[8px] after:border-x-transparent after:border-t-cream-light"
                    : "px-[10px]"
                } font-heading text-[16px] italic leading-[1.65] text-body md:text-[17px]`}
              >
                <p>{s.text}</p>
              </blockquote>
              <figcaption className="mt-[25px] flex items-center gap-[20px] text-left">
                {s.image ? (
                  <Image src={s.image.url} alt="" width={s.image.width} height={s.image.height} sizes="50px" className="h-[50px] w-[50px] rounded-full border border-gold/30 object-cover" loading="lazy" />
                ) : (
                  <span aria-hidden="true" className="h-[50px] w-[50px] rounded-full border border-gold/30 bg-cream" />
                )}
                <span>
                  <span className="block text-[16px] font-semibold text-primary">{s.name}</span>
                  {s.source && <span className="block text-[13px] text-muted">{s.source}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ standard: trust boxes */

const TRUST = [
  { icon: "shipping-fast", title: "Free Delivery", text: "Above ₹499" },
  { icon: "shield-alt", title: "Secure Transactions", text: "Safe Payment Methods" },
  { icon: "retweet", title: "Reliable Support", text: "Flawless Logistics" },
  { icon: "crown", title: "Premium Quality", text: "Top Brand Products" },
] as const;

export function SafeCheckout() {
  return (
    <div className="mt-[25px]">
      <div className="flex items-center gap-[12px]" role="presentation">
        <span aria-hidden="true" className="h-px flex-1 bg-gold/40" />
        <p className="text-[12px] font-bold tracking-[0.18em] text-gold-dark">100% SAFE CHECKOUT</p>
        <span aria-hidden="true" className="h-px flex-1 bg-gold/40" />
      </div>
      <ul className="card-soft mt-[18px] grid grid-cols-2 gap-y-[22px] px-[8px] py-[20px] md:grid-cols-4">
        {TRUST.map((t) => {
          const icon = TRUST_ICONS[t.icon];
          return (
            <li key={t.title} className="flex flex-col items-center text-center">
              <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-gold/35 bg-cream text-gold-dark">
                <svg viewBox={icon.viewBox} width="28" height="28" fill="currentColor" aria-hidden="true">
                  <path d={icon.d} />
                </svg>
              </span>
              <p className="mt-[12px] px-1 font-heading text-[15px] font-semibold leading-[1.3] text-primary">{t.title}</p>
              <p className="mt-[2px] text-[13px] leading-[1.4] text-muted">{t.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
