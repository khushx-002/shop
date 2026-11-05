/**
 * Small white header of the cart (with products), checkout and thank-you pages: green Jivo logo
 * on the left and the steps on the same line, a thin `line` border below, no menu and no top bar.
 * On phones (< 768px) the logo is hidden and only the current step shows, like the old site.
 *
 * The page renders it at the top of <main>. Its `data-checkout-layout` attribute hides the green
 * site header and the footer's safe-checkout strip with CSS (see globals.css), so the shared
 * storefront layout never has to know the page or the cart state (and never reads cookies).
 */
import Link from "next/link";
import { routes } from "@/lib/routes";
import { StepsBar } from "./StepsBar";
import { AnimatedJivoLogo } from "@/components/ui/AnimatedJivoLogo";

export function CheckoutHeader({ active }: { active: 1 | 2 | 3 }) {
  return (
    <div data-checkout-layout="" className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-[6px]">
      <div className="site-container flex min-h-[76px] items-center justify-center min-[768px]:min-h-[92px] min-[768px]:justify-between">
        <Link href={routes.home} aria-label="Jivo Mart home" className="hidden shrink-0 rounded-[8px] min-[768px]:block">
          <AnimatedJivoLogo className="mb-[4px] mt-[8px] aspect-[357/151] h-[44px] w-auto text-primary" />
        </Link>
        <StepsBar active={active} variant="header" />
      </div>
    </div>
  );
}
