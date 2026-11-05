/**
 * /about-us/ – brand page. The old page was overwritten by spam; the text now comes from the
 * "about-us" row of the pages table (editable in the admin) and is laid out in the heritage
 * "Our Story" style, alternating white and light-cream sections:
 *   cream hero → brand story (#our-story, image/text row) → "Building a healthy economy together!"
 *   (text/image row) → "Our Core Tenets" (#core-values, value cards with gold icons) → quote →
 *   any extra admin sections → green contact box.
 * The footer links to /about-us/#our-story and /about-us/#core-values.
 */
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { splitAbout } from "@/components/content/about";
import { ContactStrip } from "@/components/content/ContactBlocks";
import { PageHeader } from "@/components/content/PageHeader";
import { htmlToPlain } from "@/components/content/format";
import intelligence from "@/components/home/icons/tenet-intelligence.svg";
import nutrition from "@/components/home/icons/tenet-nutrition.svg";
import everyone from "@/components/home/icons/tenet-everyone.svg";
import { RichText } from "@/components/ui/RichText";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getPage, imageSize } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const revalidate = 3600;

const STORY_IMAGE = "/images/home/Super-Oils.jpg";
const ECONOMY_IMAGE = "/images/home/healthy-economy-vector.webp";
/** Same icons as the home page "Core Tenets" band; drawn in gold here with a CSS mask. */
const TENET_ICONS: StaticImageData[] = [intelligence, nutrition, everyone];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about-us");
  return pageMetadata({
    title: page?.seoTitle || page?.title || "About Us",
    description: page?.seoDescription || htmlToPlain(page?.bodyHtml) || undefined,
    path: routes.about,
  });
}

/** Story text: larger, relaxed body copy with ink-coloured bold words. */
const storyProse = "text-[16px] leading-[1.8] text-body md:text-[17px] [&_strong]:text-ink [&>*:last-child]:mb-0";

/** Left-aligned section heading (eyebrow → Playfair H2 → gold line). */
function SplitHeading({ id, eyebrow, title }: { id?: string; eyebrow: string; title: string }) {
  return (
    <div className="mb-[22px]">
      <span className="eyebrow mb-[10px]">{eyebrow}</span>
      <h2 id={id} className="font-heading text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.15] text-primary">
        {title}
      </h2>
      <span aria-hidden="true" className="gold-line mt-[16px]" />
    </div>
  );
}

export default async function AboutPage() {
  const page = await getPage("about-us");
  if (!page) notFound();
  const about = splitAbout(page.bodyHtml);
  const storySize = imageSize(STORY_IMAGE) ?? { width: 500, height: 480 };
  const economySize = imageSize(ECONOMY_IMAGE) ?? { width: 1900, height: 1264 };

  return (
    <>
      <PageHeader eyebrow="Our story" title={page.title} subtitle={page.seoDescription ?? undefined} crumbs={[{ label: "Home", href: routes.home }, { label: page.title }]} />

      {/* Brand story: text + framed image */}
      <section id="our-story" aria-labelledby="our-story-title" className="section scroll-mt-[90px] bg-white">
        <div className="site-container grid items-center gap-[40px] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-[72px]">
          <div>
            <SplitHeading id="our-story-title" eyebrow="Who we are" title="Our Story" />
            <RichText html={about.storyHtml} className={storyProse} />
            <Link href={routes.shop} className="btn btn-primary mt-[26px]">
              Shop our range
            </Link>
          </div>
          <div className="relative mx-auto w-full max-w-[440px] md:mr-0">
            <span aria-hidden="true" className="absolute inset-0 translate-x-[8px] translate-y-[10px] rounded-[24px] border border-gold/50 md:translate-x-[14px] md:translate-y-[14px]" />
            <Image
              src={STORY_IMAGE}
              alt="Jivo Super Oils range: mustard, groundnut, olive, canola, extra virgin olive, pomace and soyabean oils"
              width={storySize.width}
              height={storySize.height}
              sizes="(max-width: 767px) calc(100vw - 46px), 440px"
              className="relative h-auto w-full rounded-[24px] bg-cream-light shadow-lift"
            />
          </div>
        </div>
      </section>

      {/* Building a healthy economy together! – image + text */}
      {about.economy && (
        <section aria-labelledby="economy-title" className="section bg-cream-light">
          <div className="site-container grid items-center gap-[36px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-[72px]">
            <div className="order-2 rounded-[24px] border border-line bg-white p-[18px] shadow-soft md:order-1 md:p-[26px]">
              <Image src={ECONOMY_IMAGE} alt="" width={economySize.width} height={economySize.height} sizes="(max-width: 767px) calc(100vw - 70px), 460px" className="h-auto w-full rounded-[16px]" />
            </div>
            <div className="order-1 md:order-2">
              <SplitHeading id="economy-title" eyebrow="Our purpose" title={about.economy.title} />
              <RichText html={about.economy.html} className="font-heading text-[19px] italic leading-[1.6] text-ink md:text-[22px] [&>*:last-child]:mb-0" />
            </div>
          </div>
        </section>
      )}

      {/* Our Core Tenets: value cards with gold icons */}
      {about.tenets && (
        <section id="core-values" aria-labelledby="core-values-title" className="section scroll-mt-[90px] bg-white">
          <div className="site-container">
            <div className="text-center">
              <span className="eyebrow mb-[12px]">What we stand for</span>
              <h2 id="core-values-title" className="font-heading text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.15] text-primary">
                {about.tenets.title}
              </h2>
              <span aria-hidden="true" className="gold-line mx-auto mt-[16px]" />
            </div>
            <ul className="mt-[40px] grid gap-[20px] md:grid-cols-3 md:gap-[24px]">
              {about.tenets.items.map((tenet, i) => {
                const icon = TENET_ICONS[i];
                return (
                  <li
                    key={tenet.title}
                    className="card-soft relative flex flex-col p-[26px] shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-[4px] hover:border-gold/45 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-[30px]"
                  >
                    <span aria-hidden="true" className="absolute right-[24px] top-[20px] font-heading text-[30px] font-bold leading-none text-gold/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span aria-hidden="true" className="flex size-[68px] items-center justify-center rounded-full border border-gold/30 bg-cream">
                      {icon ? (
                        <span
                          className="block size-[40px] bg-gold-dark"
                          style={{ maskImage: `url(${icon.src})`, WebkitMaskImage: `url(${icon.src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
                        />
                      ) : (
                        <span className="block size-[10px] rounded-full bg-gold" />
                      )}
                    </span>
                    <h3 className="mt-[22px] font-heading text-[22px] font-bold leading-[1.25] text-primary">{tenet.title}</h3>
                    <p className="mt-[12px] text-[15px] leading-[1.7] text-body md:text-[16px]">{tenet.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Brand promise quote */}
      <section aria-label="Our promise" className="section bg-cream-light">
        <figure className="site-container">
          <div className="mx-auto max-w-[860px] border-l-[3px] border-gold pl-[22px] md:pl-[40px]">
            <span aria-hidden="true" className="block font-heading text-[64px] leading-[0.6] text-gold/60">
              &ldquo;
            </span>
            <blockquote className="mt-[10px]">
              <p className="font-heading text-[24px] font-semibold italic leading-[1.35] text-primary md:text-[28px]">Let Nature Reclaim You!</p>
            </blockquote>
            <figcaption className="eyebrow mt-[16px]">Jivo Wellness</figcaption>
          </div>
        </figure>
      </section>

      {/* Any extra sections an admin adds to the page */}
      {about.other.map((s) => (
        <section key={s.title} className="section bg-white">
          <div className="site-container">
            {s.title && <SectionTitle title={s.title} className="mb-[24px]" />}
            <RichText html={s.html} className="mx-auto max-w-[860px] text-[16px] leading-[1.75]" />
          </div>
        </section>
      ))}

      <div className="pt-[48px] md:pt-[72px]">
        <ContactStrip title="Get in touch" text="Questions about our products or your order? We are here to help." />
      </div>
    </>
  );
}
