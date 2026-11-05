"use client";
/**
 * The buying part of the product page: pack-size swatches, then
 *  - standard page: price of the selected pack, quantity, "Add to cart" (opens the mini cart) and
 *    "Buy now" (adds, then goes to checkout);
 *  - rich page: only one "Add To Cart" button, like the old page (prices are on the pack pictures).
 * When nothing can be bought, the waiting-list notice is shown instead.
 *
 * Prices shown here only inform the visitor; the cart API always re-reads prices from the database.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { WaitlistForm } from "@/components/product/WaitlistForm";
import { MAX_QTY, clampQty, usePack } from "@/components/product/PackContext";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { formatPaise } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import type { VariationView } from "@/lib/types";

/** Shopping-bag outline used on the old add-to-cart buttons. */
export function BagIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h12l1 14H5L6 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ swatches */

/**
 * Image swatches (old "Variation Swatches" plugin): 180×140 boxes with a 160×120 picture that
 * already shows "Save 34% / 1 Litre / ₹189 / ₹285". Heritage look: 10px corners, warm grey border,
 * gold on hover, green border + cream background when selected; sold-out packs are crossed out
 * and cannot be picked.
 * Keyboard: it is a radio group (arrow keys move between packs).
 */
export function PackSwatches({ label, compact = false, className = "" }: { label: string; compact?: boolean; className?: string }) {
  const { variations, selected, select } = usePack();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!variations.length) return null;

  const enabled = variations.map((v) => v.inStock);
  const move = (from: number, dir: 1 | -1) => {
    for (let step = 1; step <= variations.length; step++) {
      const i = (from + dir * step + variations.length) % variations.length;
      if (enabled[i]) {
        select(variations[i].id);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap justify-evenly gap-[12px] ${className}`}>
      {variations.map((v, i) => {
        const isSel = selected?.id === v.id;
        return (
          <button
            key={v.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSel}
            aria-disabled={!v.inStock || undefined}
            // The price is only drawn inside the pack picture (alt=""), so screen readers get it from the name.
            aria-label={`${v.valueLabel}, ${formatPaise(v.pricePaise, false)}${v.regularPricePaise > v.pricePaise ? ` (was ${formatPaise(v.regularPricePaise, false)})` : ""}${v.inStock ? "" : " (out of stock)"}`}
            title={v.valueLabel}
            tabIndex={isSel || (!selected && i === 0) ? 0 : -1}
            onClick={() => v.inStock && select(v.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] border transition-[border-color,box-shadow,background-color] ${
              compact ? "h-[64px] w-[84px]" : "h-[110px] w-[145px] sm:h-[126px] sm:w-[166px]"
            } ${
              isSel
                ? "border-primary bg-cream-light shadow-[0_0_0_1px_var(--color-primary)]"
                : v.inStock
                  ? "border-line bg-white hover:border-gold hover:shadow-[0_0_0_1px_var(--color-gold)]"
                  : "cursor-not-allowed border-line bg-white opacity-40"
            }`}
          >
            {v.swatchImage ? (
              <Image src={v.swatchImage} alt="" width={160} height={120} sizes={compact ? "80px" : "160px"} className="h-auto w-[92%] mix-blend-multiply" loading="lazy" />
            ) : (
              <span className="px-2 text-center text-[15px] font-semibold text-primary">{v.valueLabel}</span>
            )}
            {!v.inStock && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),#c62828,transparent_calc(50%+1px))]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ quantity */

export function QuantityStepper({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const { qty, setQty, productName } = usePack();
  const inputId = useId();
  const [text, setText] = useState(String(qty));
  // keep the text box in sync when qty changes from the +/- buttons
  const [lastQty, setLastQty] = useState(qty);
  if (lastQty !== qty) {
    setLastQty(qty);
    setText(String(qty));
  }
  const h = size === "sm" ? "h-[44px]" : "h-[48px]";
  const step = "flex w-[36px] items-center justify-center text-primary transition-colors hover:bg-cream disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-[10px] border border-line bg-white ${h} ${className}`}>
      <button type="button" onClick={() => setQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity" className={step}>
        <Icon name="minus" size={14} />
      </button>
      <label className="sr-only" htmlFor={inputId}>
        {productName} quantity
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QTY}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n)) setQty(n);
        }}
        onBlur={() => setText(String(clampQty(Number(text) || 1)))}
        className="w-[42px] border-x border-line text-center text-[16px] font-semibold text-ink outline-none [appearance:textfield] focus:bg-cream-light focus:shadow-[inset_0_0_0_2px_var(--color-gold)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => setQty(qty + 1)} disabled={qty >= MAX_QTY} aria-label="Increase quantity" className={step}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ add to cart / buy now */

/** Adds the selected pack. `buyNow` skips the mini cart and opens the checkout. */
export function useAddSelected() {
  const { selected, qty } = usePack();
  const { addItem } = useCart();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "adding" | "buying" | "added">("idle");
  const run = async (buyNow: boolean) => {
    if (!selected?.inStock || state === "adding" || state === "buying") return;
    setState(buyNow ? "buying" : "adding");
    const res = await addItem(selected.id, qty, { openDrawer: !buyNow });
    if (res.ok && buyNow) {
      router.push(routes.checkout);
      return; // keep the "Please wait" state while the checkout loads
    }
    setState(res.ok ? "added" : "idle");
    if (res.ok) window.setTimeout(() => setState("idle"), 2000);
  };
  return { state, add: () => run(false), buyNow: () => run(true), canBuy: !!selected?.inStock };
}

type PanelProps = {
  variant: "rich" | "standard";
  attributeName: string;
  /** id put on the buttons row; the sticky bar watches it */
  anchorId?: string;
};

export function PurchasePanel({ variant, attributeName, anchorId }: PanelProps) {
  const { variations, selected, productId, productName } = usePack();
  const { state, add, buyNow } = useAddSelected();
  const anyInStock = variations.some((v) => v.inStock);

  if (!anyInStock) {
    // Nothing sellable: no price, just the waiting list (old site behaviour).
    return (
      <div className={variant === "rich" ? "mt-6 px-4" : "mt-4"}>
        <WaitlistForm productId={productId} />
      </div>
    );
  }

  const soldOutPack = selected && !selected.inStock;
  const busy = state === "adding" || state === "buying";
  const status = state === "added" ? `${productName}${selected ? ` – ${selected.valueLabel}` : ""} was added to your cart.` : "";

  const priceBlock = selected && selected.inStock && <Price pricePaise={selected.pricePaise} regularPricePaise={selected.regularPricePaise} variant="product" />;

  if (variant === "rich") {
    return (
      <div>
        <h2 className="mt-[10px] px-4 font-heading text-[20px] font-semibold text-primary">Select Pack</h2>
        <PackSwatches label={attributeName} className="mt-[12px] px-4" />
        {soldOutPack ? (
          <div className="mt-3 px-4">
            <WaitlistForm productId={productId} variationId={selected.id} message="This pack size is currently out of stock." />
          </div>
        ) : (
          // Like the old page: only one wide "Add To Cart" under the packs (the price is on the pack pictures).
          <div id={anchorId} className="mt-[18px] flex justify-center px-4">
            <button
              type="button"
              onClick={add}
              disabled={busy}
              aria-busy={state === "adding"}
              className="btn btn-primary h-[48px] w-full text-[15px] disabled:opacity-60"
            >
              {state === "adding" ? <Spinner /> : state === "added" ? <Icon name="check" size={18} /> : <BagIcon size={18} />}
              {state === "added" ? "Added" : "Add To Cart"}
            </button>
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </div>
    );
  }

  // standard template (XStore single product form)
  return (
    <div>
      <PackSwatches label={attributeName} />
      {/* big green price (Price "product" variant, enlarged here) */}
      <div className="mt-5 [&_ins]:text-[30px] md:[&_ins]:text-[34px]">{priceBlock}</div>
      {soldOutPack ? (
        <div className="mt-3">
          <WaitlistForm productId={productId} variationId={selected.id} message="This pack size is currently out of stock." />
        </div>
      ) : (
        <div id={anchorId} className="mt-5">
          <div className="flex items-center gap-[12px]">
            <QuantityStepper size="md" />
            <button
              type="button"
              onClick={add}
              disabled={busy}
              aria-busy={state === "adding"}
              className="btn btn-primary h-[48px] min-w-0 flex-1 px-4 text-[15px] disabled:opacity-60"
            >
              {state === "adding" ? <Spinner /> : state === "added" ? <Icon name="check" size={17} /> : <BagIcon size={17} />}
              {state === "added" ? "Added" : "Add to cart"}
            </button>
          </div>
          <div className="my-[12px] flex items-center gap-3 text-[12px] uppercase tracking-[0.14em] text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            onClick={buyNow}
            disabled={busy}
            className="btn btn-outline h-[48px] w-full text-[15px] disabled:opacity-60"
          >
            {state === "buying" ? <Spinner /> : <BagIcon size={17} />}
            {state === "buying" ? "Please wait…" : "Buy now"}
          </button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export function Spinner() {
  return <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

/** Text label for a pack in compact places (sticky bar select). */
export function packOptionLabel(v: VariationView): string {
  return v.inStock ? v.valueLabel : `${v.valueLabel} (out of stock)`;
}
