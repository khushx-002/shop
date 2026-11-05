/**
 * "Building a healthy economy together!" with the "Our Story" button
 * (old site: blue band, section 6be8ff0). The old button linked to jivo.in/about/who-we-are
 * (now a 404), so it goes to our About page.
 *
 * Heritage look (reference "story / sample-kit" box): a Jivo-green box with 26px corners inside the
 * page container. Text side: small gold-light label, white Playfair heading whose last word is
 * gold-light italic, light text and a gold-light button. Picture side: the illustration on a soft
 * cream panel. Phones: text first, picture below.
 * `background` (the old band colour from home.json) is still accepted but no longer shown.
 */
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { imageSize } from "@/lib/catalog";
import { routes } from "@/lib/routes";

type Props = { before: string; title: string; after: string; button: string; image: string; background?: string };

/** "Building a healthy economy together!" -> ["Building a healthy economy", "together!"] (last word is highlighted). */
function splitLastWord(text: string): [string, string] {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return [words.join(" "), last];
}

export function HealthyEconomy({ before, title, after, button, image }: Props) {
  const size = imageSize(image) ?? { width: 1900, height: 1264 };
  const [lead, highlight] = splitLastWord(before);
  return (
    // pt-0: "Our Range" above already ends with the section space (avoids a double white gap)
    <section className="section pt-0">
      <div className="site-container">
        <div className="grid items-stretch overflow-hidden rounded-[22px] bg-primary text-white shadow-lift md:grid-cols-[1.08fr_0.92fr] md:rounded-[26px]">
          <div className="px-[22px] py-[40px] text-center md:px-[48px] md:py-[54px] md:text-left lg:px-[60px] lg:py-[64px]">
            <span className="eyebrow text-gold-light">Who we are</span>
            <h2 className="mt-[12px] font-heading text-[clamp(30px,3.4vw,44px)] font-bold leading-[1.15] text-white">
              {lead && <>{lead} </>}
              <em className="italic text-gold-light">{highlight}</em>
            </h2>
            <span aria-hidden="true" className="gold-line mx-auto mt-[20px] md:mx-0" />
            <p className="mx-auto mt-[20px] max-w-[480px] text-[17px] font-semibold leading-[1.5] text-white md:mx-0 md:text-[19px]">{title}</p>
            <p className="mt-[12px] text-[15px] leading-[1.65] text-[#DFE8E2]">{after}</p>
            <Link href={routes.about} className="btn mt-[28px] bg-gold-light px-[26px] text-primary hover:bg-white">
              {button}
              <Icon name="arrow-left" size={18} strokeWidth={1.8} className="rotate-180" />
            </Link>
          </div>
          <div className="flex items-center justify-center bg-[radial-gradient(circle_at_50%_45%,var(--color-cream-light)_0%,#F0E5D0_100%)] px-[24px] py-[28px] md:px-[36px] md:py-[40px]">
            <Image src={image} alt="" width={size.width} height={size.height} sizes="(max-width: 767px) 88vw, 460px" className="block h-auto w-full max-w-[460px]" />
          </div>
        </div>
      </div>
    </section>
  );
}
