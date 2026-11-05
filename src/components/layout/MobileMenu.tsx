"use client";
/**
 * Hamburger button (tablet/phone header) + the off-canvas menu (slides in from the right) (ui-mobile-menu__mobile__01):
 * logo, product search, Shop All / Contact us / Account, Login & Register (or account links when
 * logged in), then the server-rendered QUICK LINKS and ALL PRODUCTS sections (`children`).
 */
import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import { CloseIcon, SignInIcon, UserEditIcon } from "./icons";
import { LogoutForm } from "./LogoutForm";
import { openAccountPanel } from "./panel-events";
import { closeOnLinkClick, useModalDialog } from "./useModalDialog";
import { AnimatedJivoLogo } from "@/components/ui/AnimatedJivoLogo";

/** Login / Register / Log out buttons (.btn look: 10px corners, normal case). */
const BUTTON = "btn h-[44px] flex-1 !px-[12px] !py-0";

export function MobileMenu({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const dialogRef = useModalDialog(open, close);
  const { cart } = useCart();
  const user = cart?.user ?? null;
  const router = useRouter();
  const id = useId();

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("s") ?? "").trim();
    close();
    router.push(q ? routes.search(q) : routes.shop);
  };

  const showAccount = (tab: "login" | "register") => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    close();
    openAccountPanel(tab);
  };

  const mainLink =
    "flex items-center justify-between border-b border-line py-[12px] font-heading text-[19px] font-semibold !text-primary transition-colors hover:!text-gold-dark";
  const accountLink = "block py-[5px] !text-body transition-colors hover:!text-gold-dark";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className={`flex size-[40px] items-center justify-center rounded-[10px] border border-line text-primary transition-colors hover:border-gold/45 hover:text-gold-dark ${className}`}
      >
        <Icon name="menu" size={24} strokeWidth={1.7} />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(340px,85vw)] max-w-none overflow-visible bg-white p-0 text-body shadow-lift backdrop:bg-primary-dark/40 open:block open:animate-[slide-in-right_.25s_ease-out] motion-reduce:open:animate-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="absolute -left-[50px] top-[20px] flex size-[38px] items-center justify-center rounded-full border border-line bg-white text-primary shadow-soft transition-colors hover:text-gold-dark"
        >
          <CloseIcon size={13} />
        </button>

        <div className="h-full overflow-y-auto px-[26px] pb-[40px] pt-[28px]" onClick={closeOnLinkClick(close)}>
          <Link href={routes.home} className="mx-auto block w-fit rounded-[6px] text-primary" aria-label="Jivo Mart home">
            <AnimatedJivoLogo className="mx-auto mt-[6px] aspect-[357/151] h-[44px] w-auto" />
          </Link>
          <span aria-hidden="true" className="gold-line mx-auto mt-[16px]" />

          <form role="search" action={routes.shop} method="get" onSubmit={onSearch} className="relative mt-[22px]">
            <label htmlFor={`${id}-s`} className="sr-only">
              Search for products
            </label>
            <input
              id={`${id}-s`}
              type="search"
              name="s"
              placeholder="Search for products..."
              maxLength={80}
              autoComplete="off"
              className="field h-[46px] !pr-[46px] !text-[16px] placeholder:text-muted"
            />
            <button type="submit" aria-label="Search" className="absolute right-[2px] top-0 flex h-full w-[44px] items-center justify-center rounded-[9px] text-primary transition-colors hover:text-gold-dark">
              <Icon name="search" size={19} strokeWidth={1.7} />
            </button>
          </form>

          <nav aria-label="Mobile" className="mt-[16px]">
            <ul>
              <li>
                <Link href={routes.shop} className={mainLink}>
                  Shop All
                  <Icon name="chevron-right" size={15} className="text-gold" />
                </Link>
              </li>
              <li>
                <Link href={routes.contact} className={mainLink}>
                  Contact us
                  <Icon name="chevron-right" size={15} className="text-gold" />
                </Link>
              </li>
              <li>
                <Link href={routes.account} className={mainLink}>
                  Account
                  <Icon name="chevron-right" size={15} className="text-gold" />
                </Link>
              </li>
            </ul>
          </nav>

          {user ? (
            <div className="mt-[18px] rounded-[16px] border border-line bg-cream p-[16px]">
              <p className="text-[14px] text-ink">
                Hello <strong className="font-semibold text-primary">{user.name || user.email}</strong>
              </p>
              <ul className="mt-[8px] grid grid-cols-2 gap-x-[10px] text-[14px]">
                <li>
                  <Link href={routes.accountOrders} className={accountLink}>
                    Orders
                  </Link>
                </li>
                <li>
                  <Link href={routes.wishlist} className={accountLink}>
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link href={routes.accountAddresses} className={accountLink}>
                    Addresses
                  </Link>
                </li>
                <li>
                  <Link href={routes.accountDetails} className={accountLink}>
                    Account details
                  </Link>
                </li>
                {user.role === "admin" && (
                  <li>
                    <Link href={routes.admin} className={accountLink}>
                      Admin
                    </Link>
                  </li>
                )}
              </ul>
              <LogoutForm className="mt-[12px]" buttonClassName={`${BUTTON} btn-outline w-full disabled:opacity-60`}>
                <SignInIcon size={16} className="rotate-180" />
                Log out
              </LogoutForm>
            </div>
          ) : (
            <div className="mt-[18px] flex gap-[10px] rounded-[16px] border border-line bg-cream p-[14px]">
              <a href={routes.account} onClick={showAccount("login")} className={`${BUTTON} btn-primary`}>
                <SignInIcon size={16} />
                Login
              </a>
              <a href={routes.account} onClick={showAccount("register")} className={`${BUTTON} btn-outline`}>
                <UserEditIcon size={15} />
                Register
              </a>
            </div>
          )}

          {children}
        </div>
      </dialog>
    </>
  );
}
