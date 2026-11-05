/**
 * Top of /shop/: the banner area and the 3 category tiles (ShopView puts the tiles in the page hero).
 *
 * Old site: desktop (>1024px) shows a wide banner carousel (1900x340), tablet and phone show
 * one tall banner (800x1000) that jumps to the "Super Oils" section. Each viewport downloads
 * only its own banner: the hidden one gets a 1x1 placeholder through <picture> art direction,
 * so the visible banner can be loaded eagerly as the LCP image.
 */
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import home from "@/content/home.json";
import { Carousel } from "@/components/ui/Carousel";
import { imageSize } from "@/lib/catalog";
import { routes } from "@/lib/routes";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const DESKTOP = "(min-width: 1025px)";
const MOBILE = "(max-width: 1024px)";
// the wide banner sits inside the 1170px site container (15px side padding on desktop)
const WIDE_SIZES = "(min-width: 1170px) 1140px, 100vw";

const WIDE_ALTS: Record<string, string> = {
  "/images/home/Super-Oils-Banner-shop.jpg": "Jivo Super Oils – nature’s best for your kitchen",
  "/images/home/Super-foods-banner-shop-new.jpg": "Jivo Super Foods – nature’s best for your kitchen",
};

function size(url: string, fallback: { width: number; height: number }) {
  return imageSize(url) ?? fallback;
}

/** <img> that only downloads when `media` matches (otherwise a 1x1 gif). */
function ArtImage({ src, alt, media, hiddenMedia, sizes, fallback }: { src: string; alt: string; media: string; hiddenMedia: string; sizes: string; fallback: { width: number; height: number } }) {
  const { width, height } = size(src, fallback);
  const { props } = getImageProps({ src, alt, width, height, sizes, loading: "eager", fetchPriority: "high" });
  return (
    <picture>
      <source media={hiddenMedia} srcSet={BLANK} />
      <source media={media} srcSet={props.srcSet} sizes={props.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- art-directed next/image props (alt is in props) */}
      <img {...props} className="block h-auto w-full" />
    </picture>
  );
}

/**
 * Desktop: wide banner carousel. Tablet + phone: one tall banner that jumps to the Super Oils
 * carousel further down. Both sit in a rounded frame with a thin gold border (heritage look).
 */
export function ShopBanners() {
  const [firstWide, ...otherWide] = home.shopBanners.wide;
  const mobile = home.shopBanners.side[0];
  if (!firstWide && !mobile) return null;
  return (
    <div className="site-container mt-[24px] md:mt-[36px] min-[64.0625rem]:!px-[15px]">
      {/* desktop: wide banner carousel */}
      {firstWide && (
        <div className="overflow-hidden rounded-[20px] border border-gold/20 shadow-soft max-[64.0625rem]:hidden">
          <Carousel perView={{ base: 1 }} gap={0} loop autoplayMs={5000} label="Shop banners">
            <ArtImage src={firstWide} alt={WIDE_ALTS[firstWide] ?? "Jivo"} media={DESKTOP} hiddenMedia={MOBILE} sizes={WIDE_SIZES} fallback={{ width: 1900, height: 340 }} />
            {otherWide.map((src) => {
              const s = size(src, { width: 1900, height: 340 });
              return <Image key={src} src={src} alt={WIDE_ALTS[src] ?? "Jivo"} width={s.width} height={s.height} sizes={WIDE_SIZES} loading="lazy" className="block h-auto w-full" />;
            })}
          </Carousel>
        </div>
      )}

      {/* tablet + phone: tall banner, links to the Super Oils carousel further down */}
      {mobile && (
        <a href="#s-oils" className="mx-auto block max-w-[560px] overflow-hidden rounded-[18px] border border-gold/20 shadow-soft min-[64.0625rem]:hidden">
          <ArtImage src={mobile} alt="Start your wellness journey with our all-in-one solution – Jivo oils" media={MOBILE} hiddenMedia={DESKTOP} sizes="(max-width: 591px) calc(100vw - 32px), 560px" fallback={{ width: 800, height: 1000 }} />
        </a>
      )}
    </div>
  );
}

/** The 3 category tiles (picture + name), shown inside the cream page hero of /shop/. */
export function ShopCategoryTiles({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Shop by category" className={className}>
      <ul className="grid grid-cols-3 gap-[10px] md:gap-[14px]">
        {home.shopTiles.map((tile) => (
          <li key={tile.categorySlug}>
            <Link
              href={routes.category(tile.categorySlug)}
              className="group flex h-full flex-col items-center rounded-[16px] border border-gold/25 bg-white p-[8px] text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-[10px]"
            >
              <span className="block w-full overflow-hidden rounded-[11px] bg-cream-light">
                <Image src={tile.image} alt="" width={125} height={120} sizes="(max-width: 1024px) 30vw, 125px" loading="lazy" className="mx-auto h-auto w-full max-w-[125px] mix-blend-multiply" />
              </span>
              <span className="mt-[8px] font-heading text-[14px] font-semibold leading-[1.2] text-primary transition-colors group-hover:text-gold-dark md:text-[16px]">{tile.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
