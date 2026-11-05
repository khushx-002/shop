"use client";
/**
 * Fixed bottom bar on tablet/phone (< 1025px), like the old XStore "mobile panel":
 * Home · Shop · Wishlist (with count) · Sign in / Account. Height = --mobile-panel-height (60px).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/lib/client/saved-lists";
import { routes } from "@/lib/routes";
import { PanelHeartIcon, PanelHomeIcon, PanelShopIcon, PanelUserIcon } from "./icons";

export function MobileBottomBar() {
  const pathname = usePathname();
  const { cart } = useCart();
  const user = cart?.user ?? null;
  const wishlist = useWishlist(user?.id);
  const count = wishlist.ids.length;

  const items = [
    { href: routes.home, label: "Home", icon: PanelHomeIcon, active: pathname === "/" },
    { href: routes.shop, label: "Shop", icon: PanelShopIcon, active: pathname.startsWith("/shop") || pathname.startsWith("/product-category") },
    { href: routes.wishlist, label: "Wishlist", icon: PanelHeartIcon, active: pathname.startsWith("/wishlist"), count },
    { href: routes.account, label: user ? "Account" : "Sign in", icon: PanelUserIcon, active: pathname.startsWith("/my-account") },
  ];

  return (
    <nav
      aria-label="Shortcuts"
      className="fixed inset-x-0 bottom-0 z-30 h-[var(--mobile-panel-height)] border-t border-line bg-white text-primary shadow-[0_-6px_20px_rgba(15,69,38,0.06)] min-[1025px]:hidden"
    >
      {/* 4 fixed columns (not flex-1): the browser may paint before all 4 items have arrived, and the first item must not move when the rest appear (layout shift). */}
      <ul className="grid h-full grid-cols-4 items-stretch">
        {items.map(({ href, label, icon: IconCmp, active, count: n }) => (
          <li key={href} className="flex flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              // Active item: dark gold text + a short gold line on top (gold-dark keeps small text readable on white).
              className={`relative flex flex-1 flex-col items-center justify-center gap-[4px] text-[12px] font-semibold leading-none transition-colors before:absolute before:left-1/2 before:top-[-1px] before:h-[2px] before:w-[28px] before:-translate-x-1/2 before:rounded-full before:bg-gold ${active ? "!text-gold-dark before:opacity-100" : "!text-primary before:opacity-0 hover:!text-gold-dark"}`}
            >
              <span className="relative">
                <IconCmp size={20} />
                {n !== undefined && (
                  <span aria-hidden="true" className="absolute -right-[10px] -top-[6px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-gold-light px-[4px] text-[10px] font-bold leading-none text-primary-dark">
                    {n}
                  </span>
                )}
              </span>
              <span>
                {label}
                {/* The badge above is aria-hidden; screen readers hear the count here, after the visible label. */}
                {n !== undefined && <span className="sr-only"> ({n} item{n === 1 ? "" : "s"})</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
