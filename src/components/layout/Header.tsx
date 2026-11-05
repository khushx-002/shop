/**
 * Site header (Server Component). Same layout as the old shop.jivo.in header, in the new
 * "heritage" look (white bar, green links, gold details):
 *
 *  top bar (all sizes):  green 34px strip with the free-delivery / coupon message (scrolls away);
 *                        Instagram / Facebook / YouTube icons on the right from tablet up
 *  desktop (≥1025px):    [JIVO logo]     Home  Products  Our Story  FAQ  Contact       search  account  (Cart pill)
 *                        (plain links like the reference site; "Products" opens the shop page, no mega menu)
 *  tablet / phone:       [JIVO logo]                                                 search  (Cart pill)  [☰]
 *
 * The static menu content (mega menu lists, search tiles, mobile menu lists) is rendered here on
 * the server and handed to small client components that only handle opening and closing.
 * No cookies are read here, so every storefront page stays static/cacheable. The top bar text
 * comes from the store settings (admin), read through the same cookie-free cache as the home page.
 */
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { AccountPanel } from "./AccountPanel";
import { CartButton } from "./CartDrawer";
import { HeaderBar } from "./HeaderBar";
import { getMenuData } from "./menu-data";
import { MobileMenuSections, SearchTiles } from "./MenuParts";
import { MobileMenu } from "./MobileMenu";
import { SearchPopup } from "./SearchPopup";
import { AnimatedJivoLogo } from "@/components/ui/AnimatedJivoLogo";

/** Green menu link; a thin gold line slides in under it on hover / keyboard focus. */
const NAV_LINK =
  "relative flex h-[44px] items-center text-[14px] font-semibold tracking-[0.01em] !text-primary transition-colors duration-200 hover:!text-gold-dark after:absolute after:inset-x-0 after:bottom-[8px] after:h-[1.5px] after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none";

/* Social links in the top bar (right side, tablet and up); same Jivo accounts as the footer. */
const TOP_SOCIAL: { name: IconName; label: string; href: string }[] = [
  { name: "instagram", label: "Instagram", href: SITE.social.instagram },
  { name: "facebook", label: "Facebook", href: SITE.social.facebook },
  { name: "youtube", label: "YouTube", href: SITE.social.youtube },
];

export async function Header() {
  const [menu, settings] = await Promise.all([getMenuData(), getSettings()]);
  const freeDelivery = settings.announcement_free_delivery || DEFAULT_SETTINGS.announcement_free_delivery;
  const coupon = settings.coupon_banner;

  return (
    <HeaderBar>
      {/* slim green top bar: one line on every screen size */}
      <div className="bg-primary text-[12px] leading-none text-white/90">
        <div className="mx-auto flex h-[34px] max-w-[1280px] items-center justify-center gap-[18px] px-[16px] min-[768px]:justify-between min-[1025px]:px-[24px]">
          <p className="flex min-w-0 items-center gap-[8px]">
            <Icon name="truck" size={15} className="shrink-0 text-gold-light" />
            <span className="truncate">{freeDelivery}</span>
            {coupon && (
              <>
                <span aria-hidden="true" className="hidden text-gold-light/70 min-[1100px]:inline">
                  •
                </span>
                <span className="hidden truncate min-[1100px]:inline">{coupon}</span>
              </>
            )}
          </p>
          <ul className="hidden shrink-0 items-center gap-[6px] min-[768px]:flex" aria-label="Jivo on social media">
            {TOP_SOCIAL.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} (opens in a new tab)`}
                  className="flex size-[28px] items-center justify-center rounded-full text-gold-light transition-colors hover:bg-gold-light hover:text-primary focus-visible:bg-gold-light focus-visible:text-primary"
                >
                  <Icon name={s.name} size={16} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* main row; `relative` = the desktop mega menu is placed under this row */}
      <div className="relative mx-auto grid h-[68px] max-w-[1280px] grid-cols-[auto_1fr] items-center gap-[12px] px-[16px] min-[768px]:h-[72px] min-[768px]:px-[20px] min-[1025px]:h-[84px] min-[1025px]:grid-cols-[1fr_auto_1fr] min-[1025px]:gap-[24px] min-[1025px]:px-[24px]">
        {/* left: logo (green; the drawing uses currentColor) */}
        <Link href={routes.home} className="col-start-1 justify-self-start rounded-[6px] text-primary" aria-label="Jivo Mart home">
          <AnimatedJivoLogo className="aspect-[357/151] h-[34px] w-auto max-w-none min-[768px]:h-[38px] min-[1025px]:h-[46px]" />
        </Link>

        {/* centre: desktop menu (same items as the reference site, where Jivo has a page for them) */}
        <nav aria-label="Main" className="col-start-2 hidden items-center gap-[28px] min-[1025px]:flex min-[1180px]:gap-[34px]">
          <Link href={routes.home} className={NAV_LINK}>
            Home
          </Link>
          <Link href={routes.shop} className={NAV_LINK}>
            Products
          </Link>
          <ul className="flex items-center gap-[28px] min-[1180px]:gap-[34px]">
            <li>
              <Link href={routes.about} className={NAV_LINK}>
                Our Story
              </Link>
            </li>
            <li>
              <Link href={routes.faq} className={NAV_LINK}>
                FAQ
              </Link>
            </li>
            <li>
              <Link href={routes.contact} className={NAV_LINK}>
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        {/* right: search, account (desktop only, like the old site), cart, menu button (tablet / phone) */}
        <div className="col-start-2 flex items-center justify-self-end gap-[4px] min-[768px]:gap-[8px] min-[1025px]:col-start-3 min-[1025px]:gap-[10px]">
          <SearchPopup title={menu.searchTitle} categories={menu.categories} trending={menu.trending}>
            <SearchTiles tiles={menu.tiles} banner={menu.banner} />
          </SearchPopup>
          <AccountPanel buttonClassName="hidden min-[1025px]:flex" />
          <CartButton className="ml-[4px] min-[1025px]:ml-[6px]" />
          <MobileMenu className="ml-[4px] min-[1025px]:hidden">
            <MobileMenuSections quickLinks={menu.quickLinks} groups={menu.groups} />
          </MobileMenu>
        </div>
      </div>
    </HeaderBar>
  );
}
