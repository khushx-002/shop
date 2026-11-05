/**
 * /cart/ – shopping cart. Dynamic (reads the cart cookie), never indexed.
 * The first render uses the server cart so there is no loading flash; after that the
 * page follows the live cart from useCart().
 */
import type { Metadata } from "next";
import { CartPage } from "@/components/checkout/CartPage";
import { getCartView } from "@/lib/cart";
import { getAllProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const metadata: Metadata = pageMetadata({ title: "Cart", path: routes.cart, noindex: true });

export default async function CartRoute() {
  const [cart, products] = await Promise.all([getCartView(), getAllProducts()]);
  // SKU column: the cart API does not carry SKUs, so send the (small, public) id -> SKU list.
  const skus: Record<number, string> = {};
  for (const p of products) for (const v of p.variations) if (v.sku) skus[v.id] = v.sku;
  return <CartPage initialCart={cart} skus={skus} />;
}
