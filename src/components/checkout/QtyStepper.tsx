"use client";
/**
 * Quantity box with − / + buttons, shaped as a rounded pill with a thin `line` border.
 * Changes are sent after a short pause (debounced), so clicking + three times makes one request.
 * Typing a number and pressing Enter / leaving the field sends it at once.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** "xs" = the small box in the checkout "Your order" list. */
type Props = { value: number; max: number; label: string; onCommit: (qty: number) => void; delayMs?: number; size?: "md" | "sm" | "xs" };

export function QtyStepper({ value, max, label, onCommit, delayMs = 600, size = "md" }: Props) {
  // null = show the server value; a string = what the customer is typing / clicking right now
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const limit = Math.max(1, max);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const send = (raw: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    const n = Math.round(Number(raw));
    setDraft(null);
    if (!Number.isFinite(n) || n < 1) return;
    const qty = Math.min(limit, n);
    if (qty !== value) onCommit(qty);
  };

  const schedule = (next: number) => {
    const clamped = String(Math.min(limit, Math.max(1, next)));
    setDraft(clamped);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => send(clamped), delayMs);
  };

  const shown = draft ?? String(value);
  const current = Number(shown) || value;
  const h = size === "xs" ? "h-[30px]" : size === "sm" ? "h-[34px]" : "h-[40px]";
  const btnW = size === "xs" ? "w-[26px]" : size === "sm" ? "w-[30px]" : "w-[36px]";
  const btn = `flex ${btnW} items-center justify-center rounded-full text-primary transition-colors hover:bg-cream aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent`;
  const icon = size === "xs" ? 9 : 12;
  return (
    <div className={`inline-flex items-stretch rounded-full border border-line bg-white p-[2px] ${h}`} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={btn} onClick={() => current > 1 && schedule(current - 1)} aria-disabled={current <= 1} aria-label={`Decrease quantity of ${label}`}>
        <Icon name="minus" size={icon} strokeWidth={2} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={limit}
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== null && !timer.current && send(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft !== null) send(draft);
          }
        }}
        aria-label={`Quantity of ${label}`}
        className={`${size === "xs" ? "w-[26px] text-[13px]" : "w-[36px] text-[15px]"} rounded-[6px] bg-transparent text-center font-bold text-ink outline-none [appearance:textfield] focus:bg-cream-light [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button type="button" className={btn} onClick={() => current < limit && schedule(current + 1)} aria-disabled={current >= limit} aria-label={`Increase quantity of ${label}`}>
        <Icon name="plus" size={icon} strokeWidth={2} />
      </button>
    </div>
  );
}
