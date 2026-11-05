"use client";
/**
 * Admin frame: dark-green left sidebar (Jivo logo + menu) and the white content area.
 * On phones the sidebar is a drawer opened from the top bar (Esc closes it, focus returns).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { logoutAction } from "@/lib/auth/actions";
import { AnimatedJivoLogo } from "@/components/ui/AnimatedJivoLogo";

type NavItem = { href: string; label: string; icon: IconName; badge?: number };

export function AdminShell({ children, userLabel, badges }: { children: ReactNode; userLabel: string; badges: { orders: number; reviews: number; messages: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const nav: NavItem[] = [
    { href: "/admin/", label: "Dashboard", icon: "home" },
    { href: "/admin/orders/", label: "Orders", icon: "cart", badge: badges.orders },
    { href: "/admin/products/", label: "Products", icon: "grid" },
    { href: "/admin/coupons/", label: "Coupons", icon: "tag" },
    { href: "/admin/shipping/", label: "Shipping", icon: "truck" },
    { href: "/admin/reviews/", label: "Reviews", icon: "star", badge: badges.reviews },
    { href: "/admin/waitlist/", label: "Waiting list", icon: "list" },
    { href: "/admin/messages/", label: "Messages", icon: "mail", badge: badges.messages },
    { href: "/admin/subscribers/", label: "Subscribers", icon: "heart" },
    { href: "/admin/customers/", label: "Customers", icon: "user" },
    { href: "/admin/settings/", label: "Settings", icon: "info" },
  ];

  // Close the drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const button = menuButton.current;
    drawer.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && drawer.current) {
        // keep focus inside the open drawer
        const items = [...drawer.current.querySelectorAll<HTMLElement>("a,button")];
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  const isActive = (href: string) => (href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href.replace(/\/$/, "")));

  const sidebar = (
    <div ref={drawer} className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link href="/admin/" className="inline-flex items-center gap-3" aria-label="Jivo Mart admin – dashboard">
          <AnimatedJivoLogo label="" className="aspect-[357/151] h-auto w-[90px] text-white" />
          <span className="font-heading text-[13px] font-semibold uppercase tracking-[.12em] text-white/80">Admin</span>
        </Link>
        <button type="button" className="rounded p-1 text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <Icon name="close" size={22} />
        </button>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded px-3 py-2.5 text-[15px] transition-colors ${active ? "bg-white/15 font-bold text-white" : "text-white/85 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-accent px-2 text-[12px] font-bold leading-5 text-black" aria-label={`${item.badge} waiting`}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/15 px-5 py-4 text-[13px] text-white/80">
        <p className="mb-2 truncate" title={userLabel}>
          Logged in as <strong className="text-white">{userLabel}</strong>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/" className="underline-offset-2 hover:text-white hover:underline">
            View shop
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="underline-offset-2 hover:text-white hover:underline">
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-[#f4f5f2]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 bg-primary lg:block">{sidebar}</aside>

      {/* phone / tablet drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside id="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin menu" className="fixed inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] bg-primary shadow-xl lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-primary px-4 py-3 text-white lg:hidden">
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="admin-drawer"
            className="rounded p-1"
            aria-label="Open admin menu"
          >
            <Icon name="menu" size={24} />
          </button>
          <Link href="/admin/" className="inline-flex items-center gap-2">
            <AnimatedJivoLogo className="aspect-[357/151] h-auto w-[64px] text-white" />
            <span className="font-heading text-[12px] font-semibold uppercase tracking-[.12em] text-white/80">Admin</span>
          </Link>
        </header>
        <main id="main" className="w-full min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
