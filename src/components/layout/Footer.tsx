/**
 * Site footer (Server Component), in the new "heritage" look:
 *  1. "Guaranteed Safe Checkout" strip with the 6 payment logos (cream background). Hidden on the
 *     cart and checkout pages, which show their own box (globals.css, like the old site).
 *  2. Dark-green area, 4 columns on desktop (2 on tablet, stacked on phones):
 *     logo + brand text + social icons | Quick Links | Shop (categories) | Get In Touch + newsletter.
 *  3. Darker bottom strip: "© <year> Jivo Mart Pvt. Ltd. | All Rights Reserved" + the policy
 *     links (the old "Useful Links" column; its heading stays for screen readers).
 * The old Quick/Useful links pointed to jivo.in pages that are 404 now, so they go to our own pages.
 */
import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import { AnimatedJivoLogo } from "@/components/ui/AnimatedJivoLogo";

const PAYMENTS = [
  { src: "/images/payments/visa-card.svg", alt: "Pay safely with Visa Card" },
  { src: "/images/payments/mastercard.svg", alt: "Pay safely with Master Card" },
  { src: "/images/payments/RuPay-Card.svg", alt: "Pay safely with RuPay Card" },
  { src: "/images/payments/UPI.svg", alt: "Pay safely with UPI" },
  { src: "/images/payments/net-banking.svg", alt: "Pay safely with Netbanking" },
  { src: "/images/payments/Easy-EMI.svg", alt: "Pay safely with easy EMI options" },
];

const SOCIAL: { name: IconName; label: string; href: string }[] = [
  { name: "facebook", label: "Facebook", href: SITE.social.facebook },
  { name: "twitter", label: "Twitter", href: SITE.social.twitter },
  { name: "instagram", label: "Instagram", href: SITE.social.instagram },
  { name: "pinterest", label: "Pinterest", href: SITE.social.pinterest },
  { name: "linkedin", label: "LinkedIn", href: SITE.social.linkedin },
  { name: "youtube", label: "YouTube", href: SITE.social.youtube },
];

const QUICK_LINKS = [
  { label: "Why Jivo", href: routes.about },
  { label: "Our Story", href: `${routes.about}#our-story` },
  { label: "Core Values", href: `${routes.about}#core-values` },
  { label: "Social Initiatives", href: SITE.brandSite, external: true },
  { label: "Our Resources", href: routes.blogs },
];

/** Shop column: the store's product categories (same slugs as the category pages). */
const SHOP_LINKS = [
  { label: "Shop All", href: routes.shop },
  { label: "Super Oils", href: routes.category("super-oils") },
  { label: "Super Juices", href: routes.category("super-juice") },
  { label: "Super Foods", href: routes.category("super-food") },
  { label: "Special Offers", href: routes.category("special-offers") },
  { label: "Track Order", href: routes.trackOrder },
];

const USEFUL_LINKS = [
  { label: "Refund Policy", href: routes.refund },
  { label: "Shipping Policy", href: routes.shipping },
  { label: "Terms & Conditions", href: routes.terms },
  { label: "Privacy Policy", href: routes.privacy },
  { label: "Disclaimer", href: routes.disclaimer },
  { label: "Contact Us", href: routes.contact },
];

/** Serif gold-light column heading. */
const HEADING = "font-heading text-[19px] font-semibold leading-[1.3] text-gold-light";
/** Footer link: soft grey-green, gold-light on hover. */
const LINK = "text-[14px] leading-[1.6] !text-[#D7E0DC] transition-colors hover:!text-gold-light";

function SafeCheckout() {
  return (
    <div id="footer-safe-checkout" className="border-t border-line bg-cream-light px-[16px] py-[30px]">
      <div className="mx-auto w-full max-w-[500px] text-center">
        <fieldset className="rounded-[16px] border border-gold/30 bg-white px-[10px] pb-[16px] pt-[2px]">
          <legend className="mx-auto px-[10px] text-[12px] font-bold uppercase tracking-[0.14em] text-ink">
            Guaranteed <span className="text-primary">Safe Checkout</span>
          </legend>
          <ul className="mt-[10px] flex flex-wrap justify-center gap-[8px]">
            {PAYMENTS.map((p) => (
              <li key={p.src}>
                <Image src={p.src} alt={p.alt} title={p.alt} width={90} height={60} unoptimized loading="lazy" className="h-[34px] w-[52px] rounded-[6px] border border-line bg-white object-contain" />
              </li>
            ))}
          </ul>
        </fieldset>
        <p className="mt-[10px] flex items-center justify-center gap-[6px] text-[13px] text-body">
          <Icon name="lock" size={14} className="text-gold-dark" />
          <span>
            Your Payment is <span className="font-semibold text-primary">100% Secure</span>
          </span>
        </p>
      </div>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto">
      <SafeCheckout />

      <div className="bg-primary-dark text-[#D7E0DC]">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-x-[26px] gap-y-[34px] px-[18px] pb-[40px] pt-[44px] min-[768px]:gap-x-[40px] min-[768px]:px-[28px] min-[1025px]:grid-cols-[1.25fr_0.75fr_0.8fr_1.35fr] min-[1025px]:gap-x-[48px] min-[1025px]:pb-[56px] min-[1025px]:pt-[64px]">
          {/* brand */}
          <div className="col-span-2 border-b border-white/15 pb-[30px] min-[1025px]:col-span-1 min-[1025px]:border-b-0 min-[1025px]:pb-0">
            <Link href={routes.home} aria-label="Jivo Mart home" className="inline-block rounded-[6px] text-white">
              <AnimatedJivoLogo className="aspect-[357/151] h-[50px] w-auto min-[1025px]:h-[56px]" />
            </Link>
            <span aria-hidden="true" className="gold-line mt-[20px]" />
            <p className="mt-[18px] max-w-[420px] text-[14px] leading-[1.75] text-[#D7E0DC]">
              A health-conscious brand dedicated to promoting sustainable living, we support initiatives from initial research to final product development, aiming to shape lives and make a significant impact in our communities.
            </p>
            <ul className="mt-[22px] flex flex-wrap items-center gap-[10px]" aria-label="Jivo on social media">
              {SOCIAL.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} (opens in a new tab)`}
                    className="flex size-[40px] items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-gold-light hover:bg-gold-light hover:text-primary-dark"
                  >
                    <Icon name={s.name} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* quick links */}
          <nav aria-labelledby="footer-quick">
            <h2 id="footer-quick" className={HEADING}>
              Quick Links
            </h2>
            <ul className="mt-[16px] space-y-[10px]">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                      {l.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link href={l.href} className={LINK}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* shop: product categories */}
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className={HEADING}>
              Shop
            </h2>
            <ul className="mt-[16px] space-y-[10px]">
              {SHOP_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* contact + newsletter */}
          <div className="col-span-2 border-t border-white/15 pt-[30px] min-[1025px]:col-span-1 min-[1025px]:border-t-0 min-[1025px]:pt-0">
            <h2 className={HEADING}>Get In Touch</h2>
            <address className="mt-[16px] space-y-[12px] text-[14px] not-italic leading-[1.6]">
              <a href={`mailto:${SITE.email}`} className="flex items-center gap-[10px] text-[16px] font-semibold !text-white transition-colors hover:!text-gold-light">
                <Icon name="mail" size={17} className="shrink-0 text-gold-light" />
                {SITE.email}
              </a>
              <p className="text-[#D7E0DC]">For Purchase &amp; Order tracking-related queries:</p>
              <a href={SITE.phoneHref} className="flex items-center gap-[10px] text-[16px] font-semibold !text-white transition-colors hover:!text-gold-light">
                <Icon name="phone" size={17} className="shrink-0 text-gold-light" />
                {SITE.phone}
              </a>
              <p className="flex max-w-[340px] gap-[10px] text-[#D7E0DC]">
                <Icon name="map-pin" size={17} className="mt-[3px] shrink-0 text-gold-light" />
                <span>{SITE.address}</span>
              </p>
            </address>

            <h2 className={`${HEADING} mt-[28px]`}>Sign Up To Our Newsletter</h2>
            <div className="relative mt-[14px]">
              <NewsletterForm />
            </div>
          </div>
        </div>

        {/* bottom strip: copyright + policy links */}
        <div className="border-t border-white/15 bg-[#06200f]">
          <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-[10px] px-[18px] py-[18px] text-center min-[768px]:px-[28px] min-[1025px]:flex-row min-[1025px]:justify-between min-[1025px]:text-left">
            <p className="text-[12px] leading-[1.7] text-[#D7E0DC] min-[1025px]:text-[13px]">
              © {year} {SITE.company} | All Rights Reserved
            </p>
            <nav aria-labelledby="footer-useful">
              <h2 id="footer-useful" className="sr-only">
                Useful Links
              </h2>
              <ul className="flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[4px]">
                {USEFUL_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[12px] leading-[1.7] !text-[#D7E0DC] transition-colors hover:!text-gold-light min-[1025px]:text-[13px]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
