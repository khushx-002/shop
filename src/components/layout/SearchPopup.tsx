"use client";
/**
 * Header search icon + the full-width search popup ("What Are You Looking For?").
 *
 * - Category select + text box + SEARCH button → /shop/?s=<query>&product_cat=<slug>
 *   (product_cat left out for "All categories"). Works as a plain GET form without JS too.
 * - Live suggestions while typing (250 ms debounce, 2+ characters) from GET /api/search/.
 *   The text box is an ARIA combobox: ArrowUp/ArrowDown move through the results, Enter opens one.
 * - Trending search chips and the product tiles/banner (server-rendered `children`).
 * - Native <dialog>: focus stays inside, Esc closes, focus returns to the search icon.
 */
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { api, routes } from "@/lib/routes";
import type { SearchSuggestion } from "@/lib/types";
import { CloseIcon } from "./icons";
import { closeOnLinkClick, useModalDialog } from "./useModalDialog";
import type { MenuLink, SearchCategory } from "./menu-data";

type Status = "idle" | "loading" | "done" | "error";

function searchUrl(q: string, category: string): string {
  const query = q.trim();
  if (!query && !category) return routes.shop;
  return routes.search(query) + (category ? `&product_cat=${encodeURIComponent(category)}` : "");
}

export function SearchPopup({
  title,
  categories,
  trending,
  className = "",
  children,
}: {
  title: string;
  categories: SearchCategory[];
  trending: MenuLink[];
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const close = () => setOpen(false);
  const dialogRef = useModalDialog(open, close, { initialFocus: inputRef });
  const ids = useId();
  const listId = `${ids}-results`;
  const titleId = `${ids}-title`;

  const trimmed = query.trim();
  const showResults = trimmed.length >= 2;

  // Debounced live search. Older requests are aborted so a slow answer never replaces a newer one.
  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(api.search(trimmed, category || undefined), { signal: controller.signal });
        const data = (await res.json()) as { results?: SearchSuggestion[] };
        if (!res.ok) throw new Error("search failed");
        setResults(data.results ?? []);
        setActive(-1);
        setStatus("done");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus("error");
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, trimmed, category]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && results[active]) return go(results[active].href);
    go(searchUrl(query, category));
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  };

  const listVisible = showResults && status !== "idle";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-haspopup="dialog"
        className={`flex size-[40px] items-center justify-center rounded-full text-primary transition-colors hover:bg-cream hover:text-gold-dark ${className}`}
      >
        <Icon name="search" size={20} strokeWidth={1.7} />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // click on the dimmed backdrop
        }}
        className="fixed inset-x-0 top-0 bottom-auto m-0 max-h-dvh w-full max-w-none overflow-y-auto rounded-b-[24px] border-b border-line bg-white p-0 text-body shadow-lift backdrop:bg-primary-dark/40 open:block open:translate-y-0 open:opacity-100 transition-[translate,opacity] duration-300 starting:open:-translate-y-6 starting:open:opacity-0 motion-reduce:transition-none"
      >
        <div className="relative px-[16px] pb-[40px] pt-[28px] min-[768px]:pt-[36px]" onClick={closeOnLinkClick(close)}>
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="absolute right-[12px] top-[12px] flex size-[40px] items-center justify-center rounded-full border border-line text-primary transition-colors hover:bg-cream hover:text-gold-dark min-[768px]:right-[20px] min-[768px]:top-[18px]"
          >
            <CloseIcon size={15} />
          </button>

          <form role="search" action={routes.shop} method="get" onSubmit={onSubmit} className="mx-auto max-w-[760px]">
            <h2 id={titleId} className="px-[36px] text-center font-heading text-[26px] font-semibold leading-[1.15] text-primary min-[768px]:text-[32px]">
              {title}
            </h2>
            <span aria-hidden="true" className="gold-line mx-auto mt-[12px]" />

            <div className="mt-[22px] flex h-[50px] overflow-hidden rounded-[12px] border border-[#d9d2c4] bg-white transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(15,69,38,0.12)]">
              <label htmlFor={`${ids}-cat`} className="sr-only">
                Category
              </label>
              <span className="relative flex shrink-0 border-r border-line bg-cream-light">
                <select
                  id={`${ids}-cat`}
                  name={category ? "product_cat" : undefined}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-full w-[118px] cursor-pointer appearance-none bg-transparent pl-[14px] pr-[30px] !text-[14px] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 min-[768px]:w-[150px]"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Icon name="chevron-down" size={14} className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-gold-dark" />
              </span>

              <label htmlFor={`${ids}-q`} className="sr-only">
                Search for products
              </label>
              <input
                ref={inputRef}
                id={`${ids}-q`}
                type="search"
                name="s"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim().length < 2) setStatus("idle");
                }}
                onKeyDown={onInputKey}
                placeholder="Search for products"
                autoComplete="off"
                maxLength={80}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={listVisible && results.length > 0}
                aria-controls={listId}
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                className="h-full min-w-0 flex-1 bg-white px-[16px] !text-[15px] text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center gap-[7px] bg-primary px-[16px] !text-[14px] font-bold text-white transition-colors hover:bg-primary-dark focus-visible:bg-primary-dark min-[768px]:px-[26px]"
              >
                <Icon name="search" size={15} strokeWidth={2} />
                <span>Search</span>
              </button>
            </div>

            {/* live suggestions */}
            <div aria-live="polite" className="sr-only">
              {listVisible && status === "done" ? `${results.length} product${results.length === 1 ? "" : "s"} found` : ""}
            </div>
            {listVisible && (
              <div className="mt-[8px] overflow-hidden rounded-[14px] border border-line bg-white shadow-soft">
                {status === "loading" && results.length === 0 && <p className="px-[16px] py-[12px] text-[14px] text-muted">Searching…</p>}
                {status === "error" && <p className="px-[16px] py-[12px] text-[14px] text-danger">Search is not available right now. Press Search to see all results.</p>}
                {status === "done" && results.length === 0 && <p className="px-[16px] py-[12px] text-[14px] text-muted">No products were found matching your selection.</p>}
                <ul id={listId} role="listbox" aria-label="Product suggestions" className={`max-h-[50vh] overflow-y-auto ${status === "loading" ? "opacity-60" : ""}`}>
                  {results.map((r, i) => (
                    <li key={r.href} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                      <Link
                        href={r.href}
                        tabIndex={-1}
                        onMouseEnter={() => setActive(i)}
                        className={`flex items-center gap-[12px] border-b border-line px-[14px] py-[8px] last:border-b-0 ${i === active ? "bg-cream-light" : ""}`}
                      >
                        <span className="relative size-[52px] shrink-0 overflow-hidden rounded-[10px] bg-cream-light">
                          {r.image ? <Image src={r.image} alt="" fill sizes="52px" className="object-contain p-[4px] mix-blend-multiply" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">{r.name}</span>
                          {r.category && <span className="block text-[12px] text-muted">{r.category}</span>}
                        </span>
                        <Price pricePaise={r.pricePaise} regularPricePaise={r.regularPricePaise} className="shrink-0 text-[14px]" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {status === "done" && results.length > 0 && (
                  <button type="submit" className="block w-full border-t border-line bg-cream px-[16px] py-[11px] text-center !text-[14px] font-bold text-primary transition-colors hover:bg-[#F0E5D0]">
                    View all results
                  </button>
                )}
              </div>
            )}

            {trending.length > 0 && (
              <div className="mt-[22px] flex flex-wrap items-center justify-center gap-[8px]">
                <span className="mr-[4px] text-[12px] font-bold uppercase tracking-[0.16em] text-gold-dark">Trending searches:</span>
                {trending.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="rounded-full border border-line bg-cream-light px-[14px] py-[5px] text-[14px] leading-[1.4] !text-ink transition-colors hover:border-gold/45 hover:!text-primary"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </form>

          {children}
        </div>
      </dialog>
    </>
  );
}
