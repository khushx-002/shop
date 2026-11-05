"use client";
/**
 * Shop / category sidebar (XStore widgets): FILTER BY CATEGORIES, FILTER BY PRICE,
 * PRODUCT STATUS and SEARCH PRODUCT.
 *
 * Every block is a normal GET form, so it also works without JavaScript (a small "Apply"
 * button appears inside <noscript>). With JavaScript, changes update the URL with
 * router.push (scroll kept) and keep the other parameters.
 */
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { queryString, type CleanParams, type StockStatus } from "@/components/catalog/params";
import { routes } from "@/lib/routes";

export type SidebarProps = {
  /** "/shop/" or "/product-category/<slug>/" (filters always go back to page 1 of this path) */
  basePath: string;
  params: CleanParams;
  mode: "shop" | "category";
  /** category of the current category page (mode="category") */
  currentCategory?: string | null;
  categories: { slug: string; name: string; count: number }[];
  priceBounds: { min: number; max: number }; // whole rupees
  status: StockStatus[];
  minPrice: number | null;
  maxPrice: number | null;
  search: string;
  /** called after a filter navigates (the mobile drawer closes itself) */
  onNavigate?: () => void;
};

const STATUS_LABELS: { value: StockStatus; label: string }[] = [
  { value: "instock", label: "In stock" },
  { value: "outofstock", label: "Out of stock" },
  { value: "onsale", label: "On sale" },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Hidden inputs that carry the other query parameters through a plain GET form. */
function Hidden({ params, omit }: { params: CleanParams; omit: string[] }) {
  return (
    <>
      {Object.entries(params)
        .filter(([k]) => !omit.includes(k))
        .map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
    </>
  );
}

function NoJsApply() {
  return (
    <noscript>
      <button type="submit" className="mt-3 text-[14px] font-semibold text-primary underline decoration-gold underline-offset-4">
        Apply
      </button>
    </noscript>
  );
}

function Block({ title, collapsible, children }: { title: string; collapsible: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section className="card-soft mb-[18px] px-[18px] pb-[18px] pt-[16px]" aria-labelledby={`${id}-t`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id={`${id}-t`} className="font-heading text-[18px] font-semibold leading-[1.3] text-primary">
            {title}
          </h2>
          <span aria-hidden="true" className="gold-line mt-[8px]" />
        </div>
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={`${id}-c`}
            aria-label={`${open ? "Hide" : "Show"} ${title.toLowerCase()}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold-dark transition-colors hover:border-gold hover:bg-cream"
          >
            <Icon name={open ? "minus" : "plus"} size={12} />
          </button>
        )}
      </div>
      <div id={`${id}-c`} hidden={!open} className="mt-[14px]">
        {children}
      </div>
    </section>
  );
}

function CheckRow({ label, checked, onChange, name, value }: { label: string; checked: boolean; onChange: (checked: boolean) => void; name: string; value: string }) {
  return (
    <li>
      <label className="group flex cursor-pointer items-center gap-[10px] py-[5px] text-[15px] leading-[1.5] text-body transition-colors hover:text-primary">
        <span className="relative flex h-[16px] w-[16px] shrink-0">
          <input
            type="checkbox"
            name={name}
            value={value}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer h-[16px] w-[16px] cursor-pointer appearance-none rounded-[4px] border border-[#d9d2c4] bg-white transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold group-hover:border-gold"
          />
          <svg viewBox="0 0 16 16" aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-[16px] w-[16px] peer-checked:block">
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="#fff" strokeWidth="2.2" />
          </svg>
        </span>
        <span className={checked ? "font-semibold text-primary" : ""}>{label}</span>
      </label>
    </li>
  );
}

export function CatalogSidebar(props: SidebarProps) {
  const { basePath, params, mode, currentCategory, categories, priceBounds, status, minPrice, maxPrice, search, onNavigate } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const collapsible = mode === "shop";

  const go = (path: string, changes: Record<string, string | null>) => {
    const href = path + queryString(params, changes);
    startTransition(() => router.push(href, { scroll: false }));
    onNavigate?.();
  };

  /* ---- categories ---- */
  // Optimistic ticks: the box changes at once while the new page loads (the sidebar is
  // re-mounted with fresh props after navigation, see the `key` where it is used).
  const [activeCat, setActiveCat] = useState(mode === "category" ? currentCategory ?? null : params.product_cat ?? null);
  const [ticked, setTicked] = useState<StockStatus[]>(status);
  const toggleCategory = (slug: string, checked: boolean) => {
    setActiveCat(checked ? slug : null);
    if (mode === "shop") return go(basePath, { product_cat: checked ? slug : null });
    // on a category page: another category opens that category page; unticking the current one goes back to /shop/
    if (checked) go(routes.category(slug), { product_cat: null });
    else go(routes.shop, { product_cat: null });
  };

  /* ---- price ---- */
  const lo = priceBounds.min;
  const hi = Math.max(priceBounds.max, priceBounds.min);
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n));
  const [range, setRange] = useState<[number, number]>([clamp(minPrice ?? lo), clamp(maxPrice ?? hi)]);
  const span = hi - lo || 1;
  const leftPct = ((range[0] - lo) / span) * 100;
  const rightPct = ((range[1] - lo) / span) * 100;
  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    go(basePath, { min_price: range[0] > lo ? String(range[0]) : null, max_price: range[1] < hi ? String(range[1]) : null });
  };

  /* ---- status ---- */
  const toggleStatus = (value: StockStatus, checked: boolean) => {
    const next = STATUS_LABELS.map((s) => s.value).filter((v) => (v === value ? checked : ticked.includes(v)));
    setTicked(next);
    go(basePath, { stock_status: next.length ? next.join(",") : null });
  };

  const thumb =
    "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent outline-none " +
    "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-[16px] [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--color-gold),0_2px_6px_rgba(15,69,38,0.25)] " +
    "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-[0_0_0_1px_var(--color-gold)] " +
    "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-gold/35 focus-visible:[&::-moz-range-thumb]:ring-4 focus-visible:[&::-moz-range-thumb]:ring-gold/35";

  return (
    <div aria-busy={pending} className={pending ? "opacity-70 transition-opacity" : undefined}>
      {categories.length > 0 && (
        <Block title="Filter by categories" collapsible={collapsible}>
          <form action={basePath} method="get">
            <Hidden params={params} omit={["product_cat"]} />
            <ul>
              {categories.map((c) => (
                <CheckRow key={c.slug} name="product_cat" value={c.slug} label={c.name} checked={activeCat === c.slug} onChange={(checked) => toggleCategory(c.slug, checked)} />
              ))}
            </ul>
            <NoJsApply />
          </form>
        </Block>
      )}

      {hi > lo && (
        <Block title="Filter by price" collapsible={collapsible}>
          <form action={basePath} method="get" onSubmit={applyPrice}>
            <Hidden params={params} omit={["min_price", "max_price"]} />
            <div className="relative mx-[8px] mb-[20px] mt-[10px] h-[16px]">
              <div className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-line" aria-hidden="true" />
              <div className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-gold" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} aria-hidden="true" />
              <input
                type="range"
                name="min_price"
                min={lo}
                max={hi}
                step={1}
                value={range[0]}
                onChange={(e) => setRange(([, b]) => [Math.min(Number(e.target.value), b), b])}
                aria-label="Minimum price"
                aria-valuetext={inr(range[0])}
                className={thumb}
              />
              <input
                type="range"
                name="max_price"
                min={lo}
                max={hi}
                step={1}
                value={range[1]}
                onChange={(e) => setRange(([a]) => [a, Math.max(Number(e.target.value), a)])}
                aria-label="Maximum price"
                aria-valuetext={inr(range[1])}
                className={thumb}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-ink" aria-live="polite">
                Price: {inr(range[0])} — {inr(range[1])}
              </p>
              <button type="submit" className="btn btn-primary min-h-[36px] px-[16px] py-[8px] text-[13px]">
                Filter
              </button>
            </div>
          </form>
        </Block>
      )}

      <Block title="Product status" collapsible={collapsible}>
        <form action={basePath} method="get">
          <Hidden params={params} omit={["stock_status"]} />
          <ul>
            {STATUS_LABELS.map((s) => (
              <CheckRow key={s.value} name="stock_status" value={s.value} label={s.label} checked={ticked.includes(s.value)} onChange={(checked) => toggleStatus(s.value, checked)} />
            ))}
          </ul>
          <NoJsApply />
        </form>
      </Block>

      <Block title="Search product" collapsible={collapsible}>
        <SearchBox search={search} onNavigate={onNavigate} />
      </Block>
    </div>
  );
}

/** WooCommerce product search widget: always searches the whole shop (/shop/?s=...). */
function SearchBox({ search, onNavigate }: { search: string; onNavigate?: () => void }) {
  const router = useRouter();
  const id = useId();
  return (
    <form
      action={routes.shop}
      method="get"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("s") ?? "").trim();
        router.push(q ? routes.search(q) : routes.shop);
        onNavigate?.();
      }}
      className="relative"
    >
      <label htmlFor={id} className="sr-only">
        Search for:
      </label>
      <input
        id={id}
        type="search"
        name="s"
        defaultValue={search}
        maxLength={100}
        placeholder="Search products…"
        className="field h-[44px] py-0 pl-[14px] pr-11 text-[14px] placeholder:text-muted"
      />
      <button type="submit" aria-label="Search" className="absolute right-[4px] top-[4px] flex h-[36px] w-[36px] items-center justify-center rounded-[8px] text-primary transition-colors hover:bg-cream hover:text-gold-dark">
        <Icon name="search" size={16} />
      </button>
    </form>
  );
}
