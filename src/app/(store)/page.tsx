/**
 * Home page (rebuild of shop.jivo.in "/"). Sections in the same order as the old Elementor page:
 *  1 banner slider · 2 marquee · 3 info tiles · 4 In The Spotlight · 5 trust badges · 6 Our Range ·
 *  7 healthy economy box · 8 Punjabi Jeera + Deals Of The Week · 9 Our Core Tenets ·
 *  10 Testimonials · 11 In The News.
 * New "heritage" look (docs/13-new-ui-style-guide.md): the second (yellow) marquee was removed by
 * decision; its texts stay in home.json (marquee2) in case it comes back.
 *
 * Texts and images come from src/content/home.json; prices and stock come from the live catalog.
 * No cookies are read here, so the page is cached and regenerated every 10 minutes.
 */
import type { Metadata } from "next";
import home from "@/content/home.json";
import { CoreTenets } from "@/components/home/CoreTenets";
import { getDealCards, getSpotlightCards } from "@/components/home/data";
import { DealsOfTheWeek } from "@/components/home/DealsOfTheWeek";
import { HealthyEconomy } from "@/components/home/HealthyEconomy";
import { HeroSlider } from "@/components/home/HeroSlider";
import { InfoTiles, type InfoTile } from "@/components/home/InfoTiles";
import { InTheNews } from "@/components/home/InTheNews";
import { OurRange } from "@/components/home/OurRange";
import { Spotlight } from "@/components/home/Spotlight";
import { Testimonials } from "@/components/home/Testimonials";
import { TrustStrip } from "@/components/home/TrustStrip";
import { JsonLd } from "@/components/seo/JsonLd";
import { Marquee } from "@/components/ui/Marquee";
import { routes } from "@/lib/routes";
import { organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = pageMetadata({ title: SITE.homeTitle, absoluteTitle: true, path: "/" });

/** Separator between marquee texts (hidden from screen readers). */
const STAR = <span aria-hidden="true">✦</span>;

export default async function HomePage() {
  const [spotlight, deals, settings] = await Promise.all([getSpotlightCards(), getDealCards(), getSettings()]);

  // The free-delivery and coupon lines are editable store settings (admin); home.json is the fallback.
  const tiles: InfoTile[] = home.infoTiles.map((tile) => {
    if (tile.title === "Fast Shipping" && settings.announcement_free_delivery) return { ...tile, text: settings.announcement_free_delivery };
    if (tile.title === "Coupons" && settings.coupon_banner) return { ...tile, text: settings.coupon_banner };
    return tile;
  });

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <h1 className="sr-only">Jivo Mart – healthy cooking oils, juices and foods</h1>

      <HeroSlider banners={home.banners} />

      {/* Calm thin band under the slider: green uppercase text, small gold separators, slow movement */}
      <Marquee
        items={home.marquee1}
        separator={STAR}
        durationSec={55}
        className="border-y border-line bg-cream py-[11px]"
        itemClassName="text-[12px] font-bold uppercase leading-[1.4] tracking-[0.14em] text-primary md:text-[13px]"
        separatorClassName="text-[11px] text-gold"
      />

      <InfoTiles tiles={tiles} />

      <Spotlight title={home.spotlight.title} subtitle={home.spotlight.subtitle} cards={spotlight} />

      <TrustStrip items={home.trust} />

      <OurRange title={home.range.title} subtitle={home.range.subtitle} items={home.range.items} />

      <HealthyEconomy
        before={home.healthy.before}
        title={home.healthy.title}
        after={home.healthy.after}
        button={home.healthy.button}
        image={home.healthy.image}
        background={home.healthy.background}
      />

      <DealsOfTheWeek
        title={home.dealsSection.title}
        background={home.dealsSection.background}
        juiceBanner={home.dealsSection.juiceBanner}
        juiceButton={home.dealsSection.juiceButton}
        juiceHref={routes.product(home.dealsSection.juiceProductSlug)}
        cards={deals}
      />

      <CoreTenets title={home.tenets.title} items={home.tenets.items} background={home.tenets.background} />

      <Testimonials title={home.testimonials.title} subtitle={home.testimonials.subtitle} items={home.testimonials.items} background={home.testimonials.background} />

      <InTheNews title={home.news.title} items={home.news.items} />
    </>
  );
}
