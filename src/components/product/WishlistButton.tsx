"use client";
/** Heart button that adds/removes a product from the wishlist (saved in the browser, synced when logged in). */
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { useCompare, useWishlist } from "@/lib/client/saved-lists";

export function WishlistButton({ productId, productName, className = "", withLabel = false }: { productId: number; productName: string; className?: string; withLabel?: boolean }) {
  const { cart, notify } = useCart();
  const wishlist = useWishlist(cart?.user?.id ?? null);
  const active = wishlist.has(productId);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={active}
      aria-label={active ? `Remove “${productName}” from wishlist` : `Add “${productName}” to wishlist`}
      onClick={() => {
        const added = wishlist.toggle(productId);
        notify("success", added ? `“${productName}” was added to your wishlist.` : `“${productName}” was removed from your wishlist.`);
      }}
    >
      <Icon name={active ? "heart-filled" : "heart"} size={18} className={active ? "text-[var(--color-active)]" : ""} />
      {withLabel && <span>{active ? "Browse Wishlist" : "Add to Wishlist"}</span>}
    </button>
  );
}

/** "Add to Compare" link (max 4 products, kept in the browser). */
export function CompareButton({ productId, productName, className = "" }: { productId: number; productName: string; className?: string }) {
  const { notify } = useCart();
  const compare = useCompare();
  const active = compare.has(productId);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={active}
      onClick={() => {
        if (active) {
          compare.remove(productId);
          notify("info", `“${productName}” was removed from compare.`);
        } else if (!compare.add(productId)) {
          notify("error", `You can compare up to ${compare.limit} products. Remove one first.`);
        } else {
          notify("success", `“${productName}” was added to compare.`);
        }
      }}
    >
      <Icon name="compare" size={16} />
      <span>{active ? "Remove" : "Add to Compare"}</span>
    </button>
  );
}
