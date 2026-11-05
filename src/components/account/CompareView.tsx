"use client";
/**
 * /compare/ content: up to 4 products side by side (list kept in the browser by useCompare).
 * Heritage look: the table sits in a rounded box; the row labels are a cream column.
 */
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";
import { useCompare } from "@/lib/client/saved-lists";
import { formatPaise } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import { BTN_SMALL_DARK } from "./form-styles";
import { PackAddToCart, useHydrated, useSavedProducts, type SavedProduct } from "./saved-products";

const CART_BTN = "btn btn-primary h-[42px] w-full px-[16px] text-[14px] !text-white disabled:opacity-60";
const TH = "w-[150px] min-w-[120px] border-b border-r border-line bg-cream px-[16px] py-[14px] text-left align-top text-[13px] font-bold uppercase tracking-[0.08em] text-primary";
const TD = "min-w-[200px] border-b border-r border-line px-[16px] py-[14px] align-top text-[15px] text-body last:border-r-0";

function Empty() {
  return (
    <div className="px-[16px] pb-[110px] pt-[64px] text-center min-[768px]:pb-[130px] min-[768px]:pt-[88px]">
      <span aria-hidden="true" className="mx-auto flex size-[84px] items-center justify-center rounded-full border border-gold/30 bg-cream text-gold-dark">
        <Icon name="compare" size={36} strokeWidth={1.4} />
      </span>
      <h2 className="mt-[20px] font-heading text-[28px] font-bold leading-[1.2] text-primary min-[768px]:text-[32px]">No products to compare</h2>
      <p className="mx-auto mt-[10px] max-w-[560px] text-[16px] leading-[1.65] text-body">
        Use the “Add to Compare” button on a product page to compare up to 4 products side by side.
      </p>
      <Link href={routes.shop} className={`${BTN_SMALL_DARK} mt-[24px] px-[28px] py-[13px] text-[14px]`}>
        Return To Shop
      </Link>
    </div>
  );
}

function packText(p: SavedProduct): string {
  return p.packs.map((x) => `${x.label} (${formatPaise(x.pricePaise)}${x.inStock ? "" : ", out of stock"})`).join(", ");
}

export function CompareView() {
  const hydrated = useHydrated();
  const { notify } = useCart();
  const compare = useCompare();
  const { products, loading, error } = useSavedProducts(hydrated ? compare.ids : []);

  if (!hydrated || (loading && products.length === 0)) {
    return (
      <div className="site-container py-[110px] text-center text-[15px] text-body" role="status">
        Loading your compare list…
      </div>
    );
  }
  if (products.length === 0) {
    if (error && compare.ids.length) {
      return (
        <div className="site-container py-[110px] text-center text-[15px] text-body" role="alert">
          Sorry, the compare list could not be loaded. Please check your connection and reload the page.
        </div>
      );
    }
    return <Empty />;
  }

  const remove = (id: number, name: string) => {
    compare.remove(id);
    notify("success", `“${name}” was removed from the compare list.`);
  };

  const row = (label: string, cell: (p: SavedProduct) => React.ReactNode) => (
    <tr>
      <th scope="row" className={TH}>
        {label}
      </th>
      {products.map((p) => (
        <td key={p.card.productId} className={TD}>
          {cell(p)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="site-container pb-[72px] pt-[36px] min-[768px]:pb-[88px] min-[768px]:pt-[52px]">
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-[12px]">
        <p className="text-[15px] text-body">
          Comparing {products.length} of {compare.limit} products.
        </p>
        <button
          type="button"
          onClick={() => {
            compare.clear();
            notify("success", "The compare list was cleared.");
          }}
          className="btn btn-outline px-[16px] py-[9px] text-[13px]"
        >
          Clear list
        </button>
      </div>
      {/* Scrolls sideways on small screens; the first column stays readable. */}
      <div className="overflow-x-auto rounded-[16px] border border-line" tabIndex={0} role="region" aria-label="Product comparison table">
        <table className="w-full border-collapse [&>tbody>tr:last-child>*]:border-b-0">
          <caption className="sr-only">Product comparison</caption>
          <tbody>
            {row("Image", (p) => (
              <Link href={p.card.href} tabIndex={-1} aria-hidden="true" className="mx-auto block size-[150px] overflow-hidden rounded-[14px] bg-cream-light p-[8px]">
                {p.card.image ? <Image src={p.card.image.url} alt="" width={140} height={140} sizes="140px" className="size-full object-contain" /> : <span className="block size-full bg-surface" />}
              </Link>
            ))}
            {row("Name", (p) => (
              <Link href={p.card.href} className="font-heading text-[17px] font-bold leading-[1.3] text-primary transition-colors hover:text-gold-dark">
                {p.card.name}
              </Link>
            ))}
            {row("Price", (p) => (
              <Price pricePaise={p.card.pricePaise} regularPricePaise={p.card.regularPricePaise} />
            ))}
            {row("Availability", (p) => (
              <span className={`text-[14px] font-semibold ${p.card.inStock ? "text-success" : "text-danger"}`}>{p.card.inStock ? "In stock" : "Out of stock"}</span>
            ))}
            {row("Rating", (p) =>
              p.card.ratingCount > 0 ? (
                <span className="flex flex-wrap items-center gap-[6px]">
                  <Stars rating={p.card.ratingAvg} size={15} />
                  <span className="text-[13px]">
                    ({p.card.ratingCount} {p.card.ratingCount === 1 ? "review" : "reviews"})
                  </span>
                </span>
              ) : (
                <span className="text-muted">No reviews yet</span>
              ),
            )}
            {row("Pack sizes", (p) => <span>{packText(p) || "–"}</span>)}
            {row("Description", (p) => <span className="block text-[14px] leading-[1.6]">{p.shortDescription ? (p.shortDescription.length >= 300 ? `${p.shortDescription.replace(/\s+\S*$/, "")}…` : p.shortDescription) : "–"}</span>)}
            {row("Add to cart", (p) => (
              <PackAddToCart product={p} buttonClassName={CART_BTN} />
            ))}
            {row("Remove", (p) => (
              <button
                type="button"
                onClick={() => remove(p.card.productId, p.card.name)}
                className="inline-flex items-center gap-[6px] rounded-[8px] px-[6px] py-[4px] text-[14px] text-body transition-colors hover:bg-[#fdecea] hover:text-danger"
                aria-label={`Remove “${p.card.name}” from the compare list`}
              >
                <Icon name="trash" size={15} />
                Remove
              </button>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
