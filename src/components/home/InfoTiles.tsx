/**
 * Three trust cards under the banner: Fast Shipping / Seamless Payments / Coupons, each with an
 * animated icon. Like the old site they are hidden on phones (Elementor "hidden-mobile").
 *
 * Heritage look (reference "trust cards"): white cards with a thin warm border and 16px corners,
 * a gold icon in a cream circle, a bold green title and muted text. Tablet: icon above the text;
 * desktop: icon left of the text. The coupon code line is shown as a small dashed "coupon" chip.
 *
 * The Lottie icons are drawn dark grey; the arbitrary variants below repaint their shapes gold
 * (CSS beats the SVG fill/stroke attributes that Lottie sets) and keep white details white.
 */
import { LottieIcon } from "@/components/ui/LottieIcon";

export type InfoTile = { title: string; text: string; lottie: string };

/** The old site showed these texts on separate lines ("…₹499 / All Over India", "… / Use Code – JIVO200"). */
function splitLines(text: string): string[] {
  return text.split(/\s+(?=All Over India|Use Code)/);
}

const GOLD_ICON =
  "[&_[fill^=rgb]:not([fill='rgb(255,255,255)'])]:fill-gold [&_[stroke^=rgb]:not([stroke='rgb(255,255,255)'])]:stroke-gold";

export function InfoTiles({ tiles }: { tiles: InfoTile[] }) {
  if (!tiles.length) return null;
  return (
    <div className="hidden md:block">
      <ul aria-label="Shopping benefits" className="site-container grid grid-cols-3 gap-[16px] pt-[44px] lg:gap-[20px]">
        {tiles.map((tile) => (
          <li
            key={tile.title}
            className="card-soft flex flex-col gap-[16px] p-[22px] transition-[border-color,box-shadow] duration-300 hover:border-gold/45 hover:shadow-soft min-[1025px]:flex-row min-[1025px]:items-start min-[1025px]:gap-[18px] min-[1025px]:p-[26px]"
          >
            <div className={`flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full border border-gold/25 bg-cream ${GOLD_ICON}`}>
              <LottieIcon src={tile.lottie} size={42} />
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-bold leading-[1.3] text-primary">{tile.title}</p>
              <p className="mt-[6px] text-[14px] leading-[1.6] text-muted">
                {splitLines(tile.text).map((line, i) =>
                  i > 0 && line.startsWith("Use Code") ? (
                    <span key={line} className="mt-[10px] block w-fit rounded-[6px] border border-dashed border-gold/70 bg-cream-light px-[8px] py-[2px] text-[13px] font-bold text-gold-dark">
                      {line}
                    </span>
                  ) : (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ),
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
