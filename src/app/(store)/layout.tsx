/**
 * Layout for every storefront page: header, footer, mini-cart drawer, mobile bottom bar,
 * cookie notice, back-to-top and toasts. The admin area (/admin) has its own layout.
 */
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { MobileBottomBar } from "@/components/layout/MobileBottomBar";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { BackToTop } from "@/components/layout/BackToTop";
import { Toasts } from "@/components/ui/Toasts";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      {/* tabIndex -1: the skip link and the back-to-top button move keyboard focus here */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      {/* keeps the end of the footer visible above the fixed bottom bar on tablet/phone */}
      <div aria-hidden="true" className="h-[var(--mobile-panel-height)] bg-[#06200f] min-[1025px]:hidden" />
      <CartDrawer />
      <MobileBottomBar />
      <CookieNotice />
      <BackToTop />
      <Toasts />
    </CartProvider>
  );
}
