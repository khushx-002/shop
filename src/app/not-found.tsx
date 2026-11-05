import Link from "next/link";
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { MobileBottomBar } from "@/components/layout/MobileBottomBar";
import { Toasts } from "@/components/ui/Toasts";

/**
 * Shown for unknown URLs (HTTP 404). Unmatched URLs are rendered by the root layout, which has
 * no shop header/footer, so this page adds the same site frame as the (store) layout.
 */
export default function NotFound() {
  return (
    <CartProvider>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="page-hero">
          <div className="site-container flex min-h-[60vh] flex-col items-center justify-center py-[64px] text-center md:py-[88px]">
            <span className="eyebrow">Page not found</span>
            <p className="mt-[10px] font-heading text-[clamp(96px,16vw,168px)] font-bold italic leading-none text-primary">
              4<span className="text-gold">0</span>4
            </p>
            <span aria-hidden="true" className="gold-line mx-auto mt-[18px]" />
            <h1 className="mt-[22px] font-heading text-[clamp(26px,3.4vw,38px)] font-bold leading-[1.2] text-primary">Oops! That page can&rsquo;t be found.</h1>
            <p className="mt-[12px] max-w-[480px] text-[16px] leading-[1.65] text-muted">It looks like nothing was found at this location. Try the shop or go back to the home page.</p>
            <div className="mt-[30px] flex flex-wrap justify-center gap-[12px]">
              <Link href="/" className="btn btn-primary">
                Go to home
              </Link>
              <Link href="/shop/" className="btn btn-outline">
                Visit the shop
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <div aria-hidden="true" className="h-[var(--mobile-panel-height)] bg-primary min-[1025px]:hidden" />
      <CartDrawer />
      <MobileBottomBar />
      <Toasts />
    </CartProvider>
  );
}
