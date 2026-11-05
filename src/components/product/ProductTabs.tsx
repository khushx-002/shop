"use client";
/**
 * Description / Additional information / Disclaimer tabs (standard template, WooCommerce tabs).
 * Accessible tabs: arrow keys, Home/End move between tabs; only the active panel is shown.
 * Panels are rendered on the server and passed in, so all text is in the HTML for SEO.
 */
import { useId, useRef, useState } from "react";

export type TabItem = { key: string; label: string; content: React.ReactNode };

export function ProductTabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!tabs.length) return null;

  const focusTab = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    setActive(n);
    refs.current[n]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Product information" className="flex flex-wrap justify-center gap-x-[22px] gap-y-[2px] border-b border-line md:gap-x-[40px]">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.key}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${t.key}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") focusTab(i + 1);
              else if (e.key === "ArrowLeft") focusTab(i - 1);
              else if (e.key === "Home") focusTab(0);
              else if (e.key === "End") focusTab(tabs.length - 1);
              else return;
              e.preventDefault();
            }}
            // DM Sans semibold labels; the active one is green with a gold underline
            className={`relative -mb-px px-[4px] py-[14px] text-[15px] font-semibold leading-[20px] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:transition-colors md:text-[16px] ${
              i === active ? "text-primary after:bg-gold" : "text-muted after:bg-transparent hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${baseId}-panel-${t.key}`}
          aria-labelledby={`${baseId}-tab-${t.key}`}
          hidden={i !== active}
          tabIndex={0}
          className="mx-auto max-w-[1140px] px-[5px] py-[30px] text-[15px] leading-[1.7] text-body"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
