/**
 * Home banner slider (old site: XStore banner carousel, 1920x521 slides, autoplay 3 s, loop, dots).
 *
 * Each slide opened a page on the old site (onclick="window.open(...)" on the banner div),
 * so the slides are real links here. The first image is the LCP element, so it is preloaded;
 * the other slides load lazily.
 *
 * Heritage look: round green arrows (white border, gold on hover; hidden on phones where the banner
 * is only ~105px high) and gold pill dots. From tablets up the dots sit on the banner's bottom edge;
 * on phones they stay under it. The dot row keeps its space before the slider starts (no layout shift).
 */
import Image from "next/image";
import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { imageSize } from "@/lib/catalog";
import { routes } from "@/lib/routes";

/** Where each banner led on the old site (old WooCommerce URLs mapped to our routes). */
const SLIDE_LINKS: Record<string, string> = {
  "/images/home/Canola-Oil.webp": routes.product("jivo-cold-press-canola-oil"),
  "/images/home/Olive-2.webp": routes.search("olive oil"),
  "/images/home/Combo.webp": routes.category("special-offers"),
  "/images/home/Comidity.webp": routes.product("jivo-kachi-ghani-mustard-oil"),
  "/images/home/Punjabi-Jeera-website-banner-arshdeep-singh2.webp": routes.product("jivo-wheatgrass-punjabi-jeera-juice-pack-of-24-160ml-pet-bottles"),
};

type Banner = { image: string; alt: string };

export function HeroSlider({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;
  return (
    <div>
      <Carousel
        perView={{ base: 1 }}
        gap={0}
        loop
        autoplayMs={5000}
        arrows
        dots
        label="Featured offers"
        arrowClassName="mx-[20px] max-md:hidden md:h-11 md:w-11"
        dotsClassName="mt-0! py-[12px] md:absolute md:bottom-[16px] md:left-1/2 md:z-10 md:-translate-x-1/2 md:py-0 md:[&>button]:ring-1 md:[&>button]:ring-white/90 md:[&>button:not([aria-current])]:bg-white/75"
      >
        {banners.map((banner, i) => {
          const size = imageSize(banner.image) ?? { width: 1920, height: 521 };
          const image = (
            <Image
              src={banner.image}
              alt={banner.alt}
              width={size.width}
              height={size.height}
              sizes="100vw"
              className="block h-auto w-full"
              {...(i === 0 ? { preload: true, fetchPriority: "high" as const } : { loading: "lazy" as const })}
            />
          );
          const href = SLIDE_LINKS[banner.image];
          return href ? (
            <Link key={banner.image} href={href} className="block">
              {image}
            </Link>
          ) : (
            <div key={banner.image}>{image}</div>
          );
        })}
      </Carousel>
    </div>
  );
}
