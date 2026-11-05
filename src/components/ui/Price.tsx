/**
 * Price display like WooCommerce: old price struck through, then the sale price (bold Jivo green).
 *
 * variants:
 *  - "classic":   category pages
 *  - "shop":      /shop/ grid
 *  - "spotlight": home "In The Spotlight" cards ( big bold ₹1209 with small struck ₹1850 raised )
 *  - "product":   product page ( big price )
 */
import { formatPaise } from "@/lib/pricing";

type Props = {
  pricePaise: number | null;
  regularPricePaise?: number | null;
  variant?: "classic" | "shop" | "spotlight" | "product";
  className?: string;
};

export function Price({ pricePaise, regularPricePaise, variant = "classic", className = "" }: Props) {
  if (pricePaise == null) return null;
  const onSale = regularPricePaise != null && regularPricePaise > pricePaise;
  if (variant === "spotlight") {
    return (
      <p className={`flex items-start gap-1 ${className}`}>
        <span className="text-[22px] font-bold tracking-[0.02em] text-primary">{formatPaise(pricePaise, false)}</span>
        {onSale && (
          <del className="text-[14px] text-muted" aria-label={`Regular price ${formatPaise(regularPricePaise!, false)}`}>
            {formatPaise(regularPricePaise!, false)}
          </del>
        )}
      </p>
    );
  }
  const sale = {
    classic: "font-bold text-primary",
    shop: "font-bold text-primary",
    product: "text-primary text-[26px] font-bold",
  }[variant];
  const old = variant === "product" ? "text-[16px]" : "";
  return (
    <p className={`price flex flex-wrap items-baseline justify-[inherit] gap-x-2 ${className}`}>
      {onSale && (
        <del className={`text-muted ${old}`}>
          <span className="sr-only">Original price was: </span>
          {formatPaise(regularPricePaise!)}
        </del>
      )}
      <ins className={`no-underline ${sale}`}>
        {onSale && <span className="sr-only">Current price is: </span>}
        {formatPaise(pricePaise)}
      </ins>
    </p>
  );
}
