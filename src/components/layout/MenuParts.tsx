/**
 * Static (server-rendered) pieces of the header menus. They are passed as children into the
 * small client components that open/close them, so their markup and images cost no client JS.
 * Expand/collapse uses native <details>/<summary>: keyboard accessible and works without JS.
 */
import Image from "next/image";
import Link from "next/link";
import { imageSize } from "@/lib/catalog";
import { Icon } from "@/components/ui/Icon";
import type { MenuBanner, MenuGroup, MenuLink, MenuProduct, MenuTile } from "./menu-data";

const SUMMARY_RESET = "list-none cursor-pointer [&::-webkit-details-marker]:hidden";

/**
 * Product picture on a small cream tile with rounded corners. The picture is multiplied onto the
 * cream, so the white background of the product photos takes the cream colour.
 */
function Thumb({ item, size }: { item: { image: string | null; label: string }; size: number }) {
  const box = "flex shrink-0 items-center justify-center rounded-[10px] bg-cream-light";
  if (!item.image) return <span aria-hidden="true" className={box} style={{ width: size, height: size }} />;
  const s = imageSize(item.image);
  const inner = size - 8;
  return (
    <span className={box} style={{ width: size, height: size }}>
      <Image
        src={item.image}
        alt=""
        width={s?.width ?? inner}
        height={s?.height ?? inner}
        sizes={`${inner}px`}
        className="object-contain mix-blend-multiply"
        style={{ width: inner, height: inner }}
      />
    </span>
  );
}

function Tag({ item, small = false }: { item: MenuProduct; small?: boolean }) {
  if (!item.tag) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-[8px] py-[4px] font-sans font-bold normal-case leading-none tracking-[0.02em] text-white ${small ? "text-[10px]" : "text-[11px]"}`}
      style={{ backgroundColor: item.tagColor }}
    >
      {item.tag}
    </span>
  );
}

/* ------------------------------------------------------------ search popup tiles + banner */

export function SearchTiles({ tiles, banner }: { tiles: MenuTile[]; banner: MenuBanner }) {
  return (
    <div className="mx-auto mt-[40px] grid max-w-[1140px] grid-cols-2 gap-x-[16px] gap-y-[22px] min-[768px]:grid-cols-4 min-[1025px]:grid-flow-col min-[1025px]:grid-cols-5 min-[1025px]:grid-rows-2 min-[1025px]:gap-x-[20px]">
      {/* Desktop: banner pinned to column 5 (rows 1-2); tiles fill columns 1-4 top-to-bottom like the old popup. */}
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="group block rounded-[16px]">
          <span className="relative block aspect-square overflow-hidden rounded-[16px] border border-gold/25 bg-linear-to-b from-cream-light to-[#F0E5D0] transition-[border-color,box-shadow] duration-200 group-hover:border-gold/45 group-hover:shadow-soft motion-reduce:transition-none">
            {t.image ? (
              <Image
                src={t.image}
                alt=""
                fill
                sizes="(min-width: 1025px) 210px, (min-width: 768px) 24vw, 45vw"
                className="object-contain p-[10px] mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : null}
          </span>
          <span className="mt-[10px] block text-[13px] font-bold uppercase leading-snug tracking-[0.04em] text-primary transition-colors group-hover:text-gold-dark">{t.label}</span>
        </Link>
      ))}
      <Link
        href={banner.href}
        className="group relative col-span-2 block h-[260px] overflow-hidden rounded-[18px] border border-gold/25 min-[768px]:col-span-4 min-[768px]:h-[320px] min-[1025px]:col-span-1 min-[1025px]:col-start-5 min-[1025px]:row-span-2 min-[1025px]:row-start-1 min-[1025px]:h-[413px]"
      >
        <Image src={banner.image} alt="" fill sizes="(min-width: 1025px) 210px, 100vw" className="object-cover object-[50%_70%] min-[1025px]:object-center" />
        <span className="relative block px-[18px] pt-[34px] text-ink">
          <span className="block text-[12px] font-bold uppercase tracking-[0.16em] text-primary">{banner.title}</span>
          <span className="mt-[8px] block font-heading text-[26px] font-semibold leading-[1.15] text-primary">{banner.text}</span>
          <span className="mt-[12px] inline-flex items-center gap-[6px] rounded-full bg-primary px-[14px] py-[7px] text-[13px] font-bold text-white transition-colors group-hover:bg-primary-dark">
            Shop Now
            <Icon name="chevron-right" size={13} />
          </span>
        </span>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------ mobile off-canvas menu sections */

export function MobileMenuSections({ quickLinks, groups }: { quickLinks: MenuLink[]; groups: MenuGroup[] }) {
  return (
    <div className="mt-[20px] border-t border-line pt-[6px]">
      <details className="group border-b border-line">
        <summary className={`${SUMMARY_RESET} flex items-center justify-between py-[13px] font-heading text-[18px] font-semibold text-primary`}>
          Quick Links
          <Icon name="chevron-down" size={16} className="text-gold-dark transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <ul className="pb-[10px] pl-[4px]">
          {quickLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block py-[7px] text-[15px] !text-body transition-colors hover:!text-gold-dark">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <p className="eyebrow pb-[2px] pt-[20px]">All Products</p>
      {groups.map((g) => (
        <details key={g.title} className="group/grp border-b border-line">
          <summary className={`${SUMMARY_RESET} flex items-center justify-between py-[12px] text-[16px] font-semibold text-primary`}>
            {g.title}
            <Icon name="chevron-down" size={16} className="text-gold-dark transition-transform duration-200 group-open/grp:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="pb-[10px]">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center gap-[12px] rounded-[10px] py-[5px] text-[14px] leading-snug !text-ink transition-colors hover:!text-primary">
                  <Thumb item={item} size={42} />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <Tag item={item} small />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
