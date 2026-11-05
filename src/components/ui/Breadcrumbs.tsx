import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/site";
import { BackLink } from "@/components/ui/BackLink";

export type Crumb = { label: string; href?: string };

/**
 * WooCommerce breadcrumb ("Home › Shop › Super Oils") with optional "Return to previous page"
 * on the right, as on the old category and product pages. Also outputs BreadcrumbList JSON-LD.
 */
export function Breadcrumbs({ items, showBack = false, className = "" }: { items: Crumb[]; showBack?: boolean; className?: string }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: SITE.url.replace(/\/$/, "") + c.href } : {}) })),
  };
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 text-[14px] text-muted ${className}`}>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <Icon name="chevron-right" size={12} className="text-gold" />}
              {c.href && i < items.length - 1 ? (
                <Link href={c.href} className="transition-colors hover:text-gold-dark">
                  {c.label}
                </Link>
              ) : (
                <span className="font-semibold text-primary" aria-current={i === items.length - 1 ? "page" : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {showBack && <BackLink />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </div>
  );
}
