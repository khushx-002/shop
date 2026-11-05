"use client";
/**
 * Listing toolbar: sorting select, grid / list switch and "Show 12 / 24 / 36 / All".
 * The selects live in GET forms (WooCommerce style) so they also work without JavaScript;
 * with JavaScript a change navigates at once and keeps the scroll position.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { queryString, type CleanParams, type ViewMode } from "@/components/catalog/params";
import { PER_PAGE_OPTIONS, SORT_OPTIONS, type SortKey } from "@/lib/types";

type Props = {
  basePath: string;
  params: CleanParams;
  sort: SortKey;
  perPage: number;
  view: ViewMode;
  /** the shop page hides the grid/list switch on phones, category pages hide it below 1024px */
  switchClassName?: string;
  showLabelClassName?: string;
};

// rounded (10px) bordered select with a green focus ring, like the .field inputs
const selectClass =
  "h-[40px] cursor-pointer appearance-none rounded-[10px] border border-line bg-white bg-[length:13px] bg-[right_12px_center] bg-no-repeat pl-[14px] pr-9 text-[14px] text-ink outline-none transition-[border-color,box-shadow] hover:border-gold/60 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(15,69,38,0.12)]";
// grid / list switch buttons: active one green
const viewClass = (active: boolean) =>
  `flex h-[36px] w-[36px] items-center justify-center rounded-[10px] border transition-colors ${active ? "border-primary bg-primary text-white" : "border-line bg-white text-body hover:border-gold hover:text-gold-dark"}`;
// small chevron drawn with an inline SVG background (keeps the native, accessible <select>)
const chevron = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230f4526' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
};

function NoJsGo() {
  return (
    <noscript>
      <button type="submit" className="ml-2 text-[13px] font-semibold text-primary underline decoration-gold underline-offset-4">
        Go
      </button>
    </noscript>
  );
}

export function Toolbar({ basePath, params, sort, perPage, view, switchClassName = "", showLabelClassName = "" }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sortId = useId();
  const perId = useId();

  const go = (changes: Record<string, string | null>) => startTransition(() => router.push(basePath + queryString(params, changes), { scroll: false }));
  const viewHref = (mode: ViewMode) => basePath + queryString(params, { view_mode: mode === "list" ? "list" : null });

  return (
    <div className="mb-[24px] flex items-center justify-between gap-3 rounded-[14px] border border-line bg-cream-light px-[10px] py-[8px] md:px-[14px]" aria-busy={pending}>
      <div className="flex items-center">
        <form action={basePath} method="get" className="flex items-center">
          {Object.entries(params)
            .filter(([k]) => k !== "orderby")
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <label htmlFor={sortId} className="sr-only">
            Shop order
          </label>
          <select id={sortId} name="orderby" value={sort} onChange={(e) => go({ orderby: e.target.value === "menu_order" ? null : e.target.value })} className={`${selectClass} w-[170px] max-w-[45vw]`} style={chevron}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <NoJsGo />
        </form>

        <div className={`ml-[16px] items-center gap-[8px] ${switchClassName || "flex"}`} role="group" aria-label="Product view">
          <Link
            href={viewHref("grid")}
            scroll={false}
            aria-current={view === "grid" ? "true" : undefined}
            aria-label="Grid view"
            className={viewClass(view === "grid")}
          >
            <Icon name="grid" size={16} />
          </Link>
          <Link
            href={viewHref("list")}
            scroll={false}
            aria-current={view === "list" ? "true" : undefined}
            aria-label="List view"
            className={viewClass(view === "list")}
          >
            <Icon name="list" size={16} />
          </Link>
        </div>
      </div>

      <form action={basePath} method="get" className="flex items-center gap-[10px]">
        {Object.entries(params)
          .filter(([k]) => k !== "et_per_page")
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <label htmlFor={perId} className={`text-[14px] text-muted ${showLabelClassName}`}>
          Show
          <span className="sr-only"> products per page</span>
        </label>
        <select id={perId} name="et_per_page" aria-label="Show products per page" value={String(perPage)} onChange={(e) => go({ et_per_page: e.target.value === "12" ? null : e.target.value })} className={`${selectClass} w-[78px]`} style={chevron}>
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="-1">All</option>
        </select>
        <NoJsGo />
      </form>
    </div>
  );
}
