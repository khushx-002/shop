/**
 * WooCommerce numbered pagination ( ‹ 1 2 3 › ) used on category pages.
 * Same rules as WordPress paginate_links(): first/last page always, 2 pages around the
 * current one, "…" for the gaps. Links keep the query string.
 */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type Props = { page: number; totalPages: number; href: (page: number) => string };

function pageList(page: number, total: number): (number | "dots")[] {
  const out: (number | "dots")[] = [];
  for (let n = 1; n <= total; n++) {
    if (n === 1 || n === total || Math.abs(n - page) <= 2) out.push(n);
    else if (out[out.length - 1] !== "dots") out.push("dots");
  }
  return out;
}

export function Pagination({ page, totalPages, href }: Props) {
  if (totalPages <= 1) return null;
  // round 40px buttons; the current page is green with white text, the others get a gold border on hover
  const box = "flex h-[40px] min-w-[40px] items-center justify-center rounded-full border px-2 text-[14px] font-semibold transition-colors";
  const link = `${box} border-line bg-white text-ink hover:border-gold hover:text-gold-dark`;
  return (
    <nav aria-label="Product pagination" className="mt-[36px] border-t border-line pt-[28px]">
      <ul className="flex flex-wrap items-center justify-center gap-[8px]">
        {page > 1 && (
          <li>
            <Link href={href(page - 1)} className={link} aria-label="Previous page">
              <Icon name="chevron-left" size={14} />
            </Link>
          </li>
        )}
        {pageList(page, totalPages).map((n, i) =>
          n === "dots" ? (
            <li key={`d${i}`} className="px-1 text-[14px] text-muted" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={`${box} border-primary bg-primary text-white`}>
                  <span className="sr-only">Page </span>
                  {n}
                </span>
              ) : (
                <Link href={href(n)} className={link}>
                  <span className="sr-only">Page </span>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <Link href={href(page + 1)} className={link} aria-label="Next page">
              <Icon name="chevron-right" size={14} />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
