/**
 * Trust badges under "In The Spotlight" (old site: XStore icon-box carousels d85e4e0 / 0016fb5).
 * The icons are the old site's own SVGs (shrunk, recoloured Jivo green) served as static files.
 *
 * Heritage look (reference "benefits bar"): one soft sage box with rounded corners.
 * Desktop: one row of 5 badges with thin dividers between them.
 * Phones and tablets: 2 columns with thin lines between the cells; the 5th badge spans both columns.
 */
import Image, { type StaticImageData } from "next/image";
import families from "@/components/home/icons/trust-families.svg";
import chemicalFree from "@/components/home/icons/trust-chemical-free.svg";
import securePayments from "@/components/home/icons/trust-secure-payments.svg";
import naturalOrganic from "@/components/home/icons/trust-natural-organic.svg";
import support from "@/components/home/icons/trust-support.svg";

const ICONS: Record<string, StaticImageData> = {
  "Trusted by 1 Lakh+ Families": families,
  "Chemical Free Products": chemicalFree,
  "Secure Payments": securePayments,
  "100% Natural & Organic": naturalOrganic,
  "Quick Support": support,
};

/** Divider lines: between columns / rows on phones and tablets, between items on desktop. */
function cellBorders(i: number, count: number): string {
  const classes = ["border-primary/10"];
  if (i % 2 === 1) classes.push("max-[1024px]:border-l");
  if (i >= 2) classes.push("max-[1024px]:border-t");
  if (i === count - 1 && count % 2 === 1) classes.push("max-[1024px]:col-span-2 max-[1024px]:justify-center");
  if (i > 0) classes.push("min-[1025px]:border-l");
  return classes.join(" ");
}

export function TrustStrip({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="site-container">
      <ul
        aria-label="Why customers trust Jivo"
        className="grid grid-cols-2 rounded-[16px] border border-primary/8 bg-sage px-[6px] py-[4px] min-[1025px]:grid-cols-5 min-[1025px]:px-[10px] min-[1025px]:py-[16px]"
      >
        {items.map((label, i) => {
          const icon = ICONS[label];
          return (
            <li key={label} className={`flex min-w-0 items-center gap-[10px] px-[10px] py-[14px] min-[1025px]:justify-center min-[1025px]:gap-[12px] min-[1025px]:px-[14px] min-[1025px]:py-[6px] ${cellBorders(i, items.length)}`}>
              {icon && <Image src={icon} alt="" width={36} height={36} className="h-[28px] w-[28px] shrink-0 md:h-[34px] md:w-[34px]" />}
              <p className="text-[13px] font-bold leading-[1.3] text-primary md:text-[14px] min-[1025px]:text-[14.5px]">{label}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
