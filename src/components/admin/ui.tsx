/**
 * Small server-rendered building blocks for admin pages (titles, cards, tables, tabs, pagination).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_STYLES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/admin/format";
import { FieldError } from "./ActionForm";

export function PageTitle({ title, children, back }: { title: string; children?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-[14px] text-primary hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-bold text-ink md:text-[28px]">{title}</h1>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-md border border-line bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] md:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-[17px] font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, href, tone = "default", hint }: { label: string; value: ReactNode; href?: string; tone?: "default" | "warn"; hint?: string }) {
  const body = (
    <>
      <span className="block text-[13px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <span className={`mt-1 block font-heading text-[28px] font-bold ${tone === "warn" ? "text-[#b45309]" : "text-primary"}`}>{value}</span>
      {hint && <span className="block text-[13px] text-muted">{hint}</span>}
    </>
  );
  const cls = "block rounded-md border border-line bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-primary focus-visible:border-primary`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[13px] font-semibold ${STATUS_STYLES[status]}`}>{ORDER_STATUS_LABELS[status]}</span>;
}

export function Pill({ children, tone = "grey" }: { children: ReactNode; tone?: "green" | "grey" | "red" | "yellow" | "blue" }) {
  const tones = {
    green: "bg-[#c6e1c6] text-[#2c4700]",
    grey: "bg-[#eee] text-[#555]",
    red: "bg-[#fbdada] text-[#8e1d1d]",
    yellow: "bg-[#f8f1d8] text-[#8a6d00]",
    blue: "bg-[#d6e4f5] text-[#1d4f91]",
  };
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Table that scrolls sideways on small screens. */
export function Table({ head, children, caption }: { head: ReactNode[]; children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface text-[13px] uppercase tracking-wide text-[#555]">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap border-b border-line px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-center text-muted">
        {text}
      </td>
    </tr>
  );
}

/** Builds a link that keeps the current filters and changes one value. */
export function hrefWith(base: string, params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && !(k === "page" && Number(v) <= 1)) sp.set(k, String(v));
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

export function Tabs({ tabs, active, label }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-4 overflow-x-auto">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`-mb-px inline-block border-b-2 px-3 py-2 text-[14px] ${on ? "border-primary font-bold text-primary" : "border-transparent text-[#555] hover:text-primary"}`}
              >
                {t.label}
                {t.count !== undefined && <span className="ml-1 text-[12px] text-muted">({t.count})</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Plain GET search form (works without JavaScript). Extra hidden values keep the current tab. */
export function SearchBox({ action, q, placeholder, hidden = {} }: { action: string; q: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} method="get" role="search" className="mb-4 flex max-w-[480px] gap-2">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="admin-search" className="sr-only">
        {placeholder}
      </label>
      <input id="admin-search" type="search" name="q" defaultValue={q} placeholder={placeholder} className="field !py-2" />
      <button type="submit" className="btn btn-primary !px-4 !py-2">
        Search
      </button>
      {q && (
        <Link href={hrefWith(action, hidden)} className="self-center whitespace-nowrap text-[14px] text-primary hover:underline">
          Clear
        </Link>
      )}
    </form>
  );
}

export function Pagination({ page, totalPages, total, href }: { page: number; totalPages: number; total: number; href: (page: number) => string }) {
  if (totalPages <= 1) return <p className="mt-3 text-[13px] text-muted">{total} item{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center gap-2 text-[14px]">
      <span className="mr-2 text-muted">
        {total} items · page {page} of {totalPages}
      </span>
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded border border-line px-3 py-1.5 hover:border-primary">
          ← Previous
        </Link>
      ) : (
        <span className="rounded border border-line px-3 py-1.5 text-muted opacity-60" aria-disabled="true">
          ← Previous
        </span>
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} className="rounded border border-line px-3 py-1.5 hover:border-primary">
          Next →
        </Link>
      ) : (
        <span className="rounded border border-line px-3 py-1.5 text-muted opacity-60" aria-disabled="true">
          Next →
        </span>
      )}
    </nav>
  );
}

/** Label + input + error. `children` is the input (give it id={name}). */
export function Field({ name, label, hint, children, className = "" }: { name: string; label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function Check({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-ink">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#0f4526]" />
        {label}
      </label>
      {hint && <p className="ml-6 text-[13px] text-muted">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok"; children: ReactNode }) {
  const tones = {
    info: "border-[#bcd3ee] bg-[#eef4fb] text-[#1d3f6e]",
    warn: "border-[#f0d58c] bg-[#fdf6e3] text-[#6b4f00]",
    ok: "border-[#b7dfb9] bg-[#edf7ee] text-[#1e5e22]",
  };
  return <div className={`mb-4 rounded border px-4 py-3 text-[14px] ${tones[tone]}`}>{children}</div>;
}
