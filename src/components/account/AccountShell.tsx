/**
 * Logged-in account area: "My account" navigation on the left (top on phones) in a soft card –
 * the current page is green with white text – and the page content on the right.
 */
import Link from "next/link";
import { LogoutForm } from "@/components/layout/LogoutForm";
import { routes } from "@/lib/routes";

export type AccountSection = "dashboard" | "orders" | "addresses" | "details";

const LINKS: { key: AccountSection | "wishlist" | "admin"; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: routes.account },
  { key: "orders", label: "Orders", href: routes.accountOrders },
  { key: "addresses", label: "Addresses", href: routes.accountAddresses },
  { key: "details", label: "Account details", href: routes.accountDetails },
  { key: "wishlist", label: "Wishlist", href: routes.wishlist },
];

const ITEM = "block w-full rounded-[10px] px-[16px] py-[11px] text-left text-[15px] font-semibold leading-[1.4] transition-colors";

export function AccountShell({ active, isAdmin = false, children }: { active: AccountSection; isAdmin?: boolean; children: React.ReactNode }) {
  const links = isAdmin ? [...LINKS, { key: "admin" as const, label: "Admin", href: routes.admin }] : LINKS;
  return (
    <div className="site-container pb-[64px] pt-[36px] min-[992px]:pb-[88px] min-[992px]:pt-[52px]">
      <div className="grid gap-[28px] min-[992px]:grid-cols-[270px_minmax(0,1fr)] min-[992px]:gap-[48px]">
        <nav aria-label="Account pages" className="card-soft self-start p-[10px] shadow-soft min-[992px]:sticky min-[992px]:top-[110px]">
          <ul className="grid gap-[2px]">
            {links.map((l) => {
              const current = l.key === active;
              return (
                <li key={l.key}>
                  <Link
                    href={l.href}
                    aria-current={current ? "page" : undefined}
                    className={`${ITEM} ${current ? "bg-primary text-white" : "text-body hover:bg-cream-light hover:text-primary"}`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
            <li className="mt-[4px] border-t border-line pt-[6px]">
              <LogoutForm buttonClassName={`${ITEM} text-body hover:bg-cream-light hover:text-danger`}>Log out</LogoutForm>
            </li>
          </ul>
        </nav>
        <div className="min-w-0 text-[15px] leading-[1.65] text-body">{children}</div>
      </div>
    </div>
  );
}
