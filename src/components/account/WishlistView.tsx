"use client";
/**
 * /wishlist/ content. The list lives in the browser (useWishlist) and is synced with the
 * account when the customer is logged in. Product data comes from GET /api/products/?ids=.
 * Heritage look: a rounded table with a cream header row on desktop, soft cards on phones.
 */
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { useWishlist } from "@/lib/client/saved-lists";
import { routes } from "@/lib/routes";
import { BTN_SMALL_DARK } from "./form-styles";
import { PackAddToCart, useHydrated, useSavedProducts } from "./saved-products";

const CART_BTN = "btn btn-primary h-[42px] w-full px-[16px] text-[14px] !text-white disabled:opacity-60";
const TH = "py-[13px] pr-[12px] text-left text-[13px] font-bold uppercase tracking-[0.08em] text-primary";
const TD = "min-[768px]:py-[18px] min-[768px]:pr-[12px] min-[768px]:align-middle";

function EmptyWishlist() {
  return (
    <div className="px-[16px] pb-[110px] pt-[64px] text-center min-[768px]:pb-[130px] min-[768px]:pt-[88px]">
      <span aria-hidden="true" className="mx-auto flex size-[84px] items-center justify-center rounded-full border border-gold/30 bg-cream text-gold-dark">
        <Icon name="heart" size={36} strokeWidth={1.4} />
      </span>
      <h2 className="mt-[20px] font-heading text-[28px] font-bold leading-[1.2] text-primary min-[768px]:text-[32px]">Your wishlist is empty</h2>
      <p className="mx-auto mt-[10px] max-w-[560px] text-[16px] leading-[1.65] text-body">
        We invite you to get acquainted with an assortment of our shop. Surely you can find something for yourself!
      </p>
      <Link href={routes.shop} className={`${BTN_SMALL_DARK} mt-[24px] px-[28px] py-[13px] text-[14px]`}>
        Return To Shop
      </Link>
    </div>
  );
}

export function WishlistView() {
  const hydrated = useHydrated();
  const { cart, notify } = useCart();
  const wishlist = useWishlist(cart?.user?.id ?? null);
  const { products, loading, error } = useSavedProducts(hydrated ? wishlist.ids : []);

  if (!hydrated || (loading && products.length === 0)) {
    return (
      <div className="site-container py-[110px] text-center text-[15px] text-body" role="status">
        Loading your wishlist…
      </div>
    );
  }
  if (products.length === 0) {
    if (error && wishlist.ids.length) {
      return (
        <div className="site-container py-[110px] text-center text-[15px] text-body" role="alert">
          Sorry, your wishlist could not be loaded. Please check your connection and reload the page.
        </div>
      );
    }
    return <EmptyWishlist />;
  }

  const remove = (id: number, name: string) => {
    wishlist.remove(id);
    notify("success", `“${name}” was removed from your wishlist.`);
  };

  return (
    <div className="site-container pb-[72px] pt-[36px] min-[768px]:pb-[88px] min-[768px]:pt-[52px]">
      <div className="min-[768px]:overflow-hidden min-[768px]:rounded-[16px] min-[768px]:border min-[768px]:border-line">
        <table className="w-full border-collapse text-[15px] min-[768px]:[&>tbody>tr:last-child]:border-b-0">
          <caption className="sr-only">Products in your wishlist</caption>
          <thead className="hidden min-[768px]:table-header-group">
            <tr className="border-b border-line bg-cream">
              <th scope="col" className={`${TH} w-[56px] pl-[16px]`}>
                <span className="sr-only">Remove</span>
              </th>
              <th scope="col" className={`${TH} w-[116px]`}>
                <span className="sr-only">Image</span>
              </th>
              <th scope="col" className={TH}>
                Product
              </th>
              <th scope="col" className={TH}>
                Unit price
              </th>
              <th scope="col" className={TH}>
                Stock status
              </th>
              <th scope="col" className={`${TH} w-[246px] pr-[16px]`}>
                <span className="sr-only">Add to cart</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const { card } = p;
              return (
                <tr
                  key={card.productId}
                  className="relative mb-[14px] grid grid-cols-[90px_1fr] gap-x-[16px] gap-y-[8px] rounded-[16px] border border-line bg-white p-[14px] shadow-soft min-[768px]:mb-0 min-[768px]:table-row min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:border-b min-[768px]:p-0 min-[768px]:shadow-none"
                >
                  <td className={`absolute right-[10px] top-[10px] min-[768px]:static min-[768px]:pl-[16px] ${TD}`}>
                    <button
                      type="button"
                      onClick={() => remove(card.productId, card.name)}
                      aria-label={`Remove “${card.name}” from wishlist`}
                      className="flex size-[32px] items-center justify-center rounded-full border border-line text-body transition-colors hover:border-danger hover:bg-[#fdecea] hover:text-danger"
                    >
                      <Icon name="close" size={13} />
                    </button>
                  </td>
                  <td className={`row-span-4 ${TD}`}>
                    <Link href={card.href} className="block size-[90px] overflow-hidden rounded-[14px] bg-cream-light p-[6px]" tabIndex={-1} aria-hidden="true">
                      {card.image ? <Image src={card.image.url} alt="" width={90} height={90} sizes="90px" className="size-full object-contain" /> : <span className="block size-full bg-surface" />}
                    </Link>
                  </td>
                  <td className={`pr-[34px] ${TD}`}>
                    {card.category && <span className="eyebrow mb-[2px] text-[11px]">{card.category.name}</span>}
                    <Link href={card.href} className="font-heading text-[17px] font-bold leading-[1.3] text-primary transition-colors hover:text-gold-dark">
                      {card.name}
                    </Link>
                  </td>
                  <td className={TD}>
                    <Price pricePaise={card.pricePaise} regularPricePaise={card.regularPricePaise} />
                  </td>
                  <td className={TD}>
                    <span className={`inline-flex items-center gap-[6px] text-[14px] font-semibold ${card.inStock ? "text-success" : "text-danger"}`}>
                      <span aria-hidden="true" className="size-[7px] rounded-full bg-current" />
                      {card.inStock ? "In stock" : "Out of stock"}
                    </span>
                  </td>
                  <td className={`col-span-2 ${TD}`}>
                    <PackAddToCart product={p} buttonClassName={CART_BTN} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-[28px]">
        <Link href={routes.shop} className="btn btn-outline">
          Continue shopping
        </Link>
      </p>
    </div>
  );
}
