"use client";
/**
 * "Add to cart" button for product cards and product pages.
 * - With a variationId: adds that pack size via the cart API and opens the mini-cart.
 * - Without one (product has several pack sizes): links to the product page ("Select options").
 * - Out of stock: shows "Read more" link (WooCommerce behaviour).
 */
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";

type Props = {
  variationId: number | null;
  href: string; // product page
  inStock: boolean;
  qty?: number;
  label?: string;
  className?: string;
  showIcon?: boolean;
  productName?: string;
  openDrawer?: boolean;
  onAdded?: () => void;
};

export function AddToCartButton({ variationId, href, inStock, qty = 1, label = "Add to cart", className = "", showIcon = false, productName, openDrawer = true, onAdded }: Props) {
  const { addItem } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  if (!inStock) {
    return (
      <Link href={href} className={className}>
        Read more
        {/* Hidden words make the link text say where it goes (search engines and screen readers). */}
        {productName && <span className="sr-only"> about {productName}</span>}
      </Link>
    );
  }
  if (!variationId) {
    return (
      <Link href={href} className={className}>
        {showIcon && <Icon name="cart" size={18} />}
        Select options
        {productName && <span className="sr-only"> for {productName}</span>}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      disabled={state === "adding"}
      aria-busy={state === "adding"}
      aria-label={productName ? `${state === "added" ? "Added" : label}: ${productName}` : undefined}
      onClick={async () => {
        setState("adding");
        const res = await addItem(variationId, qty, { openDrawer });
        setState(res.ok ? "added" : "idle");
        if (res.ok) {
          onAdded?.();
          window.setTimeout(() => setState("idle"), 2000);
        }
      }}
    >
      {showIcon && (state === "adding" ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name={state === "added" ? "check" : "cart"} size={18} />)}
      {state === "added" ? "Added" : label}
    </button>
  );
}
