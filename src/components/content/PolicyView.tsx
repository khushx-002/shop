/**
 * Layout for policy pages from the pages table (privacy policy, refund & returns, shipping,
 * terms & conditions, disclaimer): cream page hero, "Last updated" date, readable prose
 * (Playfair headings, max ~760px) and a soft "Store policies" side card.
 */
import Link from "next/link";
import { PageHeader } from "@/components/content/PageHeader";
import { formatDate, isoDate } from "@/components/content/format";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { routes } from "@/lib/routes";
import { SITE } from "@/lib/site";
import type { PageView } from "@/lib/types";

/** Typography for long legal text stored as HTML (h2/h3 headings, lists, tables). */
export const policyProse =
  "text-[16px] leading-[1.8] text-body [&_h2]:mt-[1.8em] [&_h2]:text-[24px] [&_h2]:leading-[1.25] md:[&_h2]:text-[28px] [&_h3]:text-[20px] [&_h3]:leading-[1.3] [&_h4]:text-[18px] [&_li]:mb-[6px] [&_strong]:text-ink [&_:is(h2,h3,h4)_strong]:text-primary [&>*:first-child]:mt-0";

const RELATED = [
  { label: "Privacy Policy", href: routes.privacy },
  { label: "Refund and Returns Policy", href: routes.refund },
  { label: "Shipping Policy", href: routes.shipping },
  { label: "Terms & Conditions", href: routes.terms },
  { label: "Disclaimer", href: routes.disclaimer },
];

const navLink = "block rounded-[8px] border-l-[3px] px-[12px] py-[8px] transition-colors";

export function PolicyView({ page }: { page: PageView }) {
  const path = routes.post(page.slug);
  return (
    <>
      <PageHeader eyebrow="Store policies" title={page.title} crumbs={[{ label: "Home", href: routes.home }, { label: page.title }]} />
      <div className="site-container pb-[64px] pt-[36px] md:pb-[88px] md:pt-[52px]">
        <div className="mx-auto grid max-w-[1100px] gap-[40px] lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-[56px]">
          <article className="min-w-0">
            <p className="mb-[28px] inline-flex items-center gap-[8px] rounded-full border border-line bg-cream-light px-[14px] py-[6px] text-[14px] text-muted">
              <Icon name="info" size={15} className="text-gold-dark" />
              Last updated: <time dateTime={isoDate(page.updatedAt)}>{formatDate(page.updatedAt)}</time>
            </p>
            <div className="max-w-[760px]">
              <RichText html={page.bodyHtml} className={policyProse} />
              <p className="mt-[36px] rounded-[16px] border-l-[3px] border-gold bg-cream px-[22px] py-[18px] text-[15px] leading-[1.65] text-ink">
                Questions about this policy? Email{" "}
                <a href={`mailto:${SITE.email}`} className="font-bold text-primary underline decoration-gold underline-offset-4 hover:text-gold-dark">
                  {SITE.email}
                </a>{" "}
                or call{" "}
                <a href={SITE.phoneHref} className="whitespace-nowrap font-bold text-primary underline decoration-gold underline-offset-4 hover:text-gold-dark">
                  {SITE.phone}
                </a>
                .
              </p>
            </div>
          </article>
          <nav aria-label="Store policies" className="card-soft self-start p-[22px] shadow-soft lg:sticky lg:top-[110px]">
            <h2 className="font-heading text-[22px] font-bold leading-[1.2] text-primary">Store policies</h2>
            <span aria-hidden="true" className="gold-line mt-[12px]" />
            <ul className="mt-[16px] space-y-[4px] text-[15px]">
              {RELATED.map((r) => (
                <li key={r.href}>
                  {r.href === path ? (
                    <span aria-current="page" className={`${navLink} border-gold bg-cream font-bold text-primary`}>
                      {r.label}
                    </span>
                  ) : (
                    <Link href={r.href} className={`${navLink} border-transparent text-body hover:bg-cream-light hover:text-primary`}>
                      {r.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link href={routes.faq} className={`${navLink} border-transparent text-body hover:bg-cream-light hover:text-primary`}>
                  FAQ&apos;s
                </Link>
              </li>
              <li>
                <Link href={routes.contact} className={`${navLink} border-transparent text-body hover:bg-cream-light hover:text-primary`}>
                  Contact Us
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
