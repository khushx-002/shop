"use client";
/**
 * Mini-cart side panel ("Shopping Cart", right off-canvas, like ui-cart-panel). Opened by the
 * header cart icon and automatically after add-to-cart (useCart().drawerOpen).
 * Lines can be changed with the -/+ stepper (or by typing a number) and removed with ×.
 * All maths (subtotal, free-shipping progress) comes from the server cart (CartView).
 */
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { formatPaise } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import type { CartLine } from "@/lib/types";
import { CloseIcon } from "./icons";
import { closeOnLinkClick, useModalDialog } from "./useModalDialog";

function QtyStepper({ line, disabled }: { line: CartLine; disabled: boolean }) {
  const { updateItem } = useCart();
  // While the visitor types, show what they typed; otherwise always show the server quantity.
  const [draft, setDraft] = useState<string | null>(null);
  const max = Math.max(1, line.maxQty);

  const commit = (value: number) => {
    setDraft(null);
    if (disabled || !Number.isFinite(value)) return;
    const qty = Math.min(max, Math.max(1, Math.round(value)));
    if (qty !== line.qty) void updateItem(line.variationId, qty);
  };

  // aria-disabled instead of disabled: a disabled button would drop keyboard focus while the cart updates.
  const btn = "flex w-[26px] items-center justify-center text-primary transition-colors hover:bg-cream hover:text-gold-dark aria-disabled:opacity-40";
  return (
    <div className="flex h-[28px] items-stretch overflow-hidden rounded-[8px] border border-[#d9d2c4] bg-white" role="group" aria-label={`Quantity of ${line.name}`}>
      <button type="button" className={btn} onClick={() => line.qty > 1 && commit(line.qty - 1)} aria-disabled={disabled || line.qty <= 1} aria-label="Decrease quantity">
        <Icon name="minus" size={12} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={draft ?? String(line.qty)}
        readOnly={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== null && commit(Number(draft) || line.qty)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft !== null) commit(Number(draft) || line.qty);
          }
        }}
        aria-label="Quantity"
        className="w-[32px] border-x border-line bg-white text-center !text-[13px] font-semibold text-ink outline-none [appearance:textfield] focus:bg-cream-light [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={btn} onClick={() => line.qty < max && commit(line.qty + 1)} aria-disabled={disabled || line.qty >= max} aria-label="Increase quantity">
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}

export function CartDrawer() {
  const { cart, loading, busy, drawerOpen, closeDrawer, removeItem } = useCart();
  const dialogRef = useModalDialog(drawerOpen, closeDrawer);
  const items = cart?.items ?? [];
  const free = cart?.freeShipping;
  const progress = free?.thresholdPaise ? Math.min(100, Math.round(((free.thresholdPaise - free.remainingPaise) / free.thresholdPaise) * 100)) : 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="mini-cart-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(390px,85vw)] max-w-none overflow-visible bg-white p-0 text-body shadow-lift backdrop:bg-primary-dark/40 open:block open:animate-[slide-in-right_.25s_ease-out] motion-reduce:open:animate-none"
    >
      <button
        type="button"
        onClick={closeDrawer}
        aria-label="Close cart"
        className="absolute -left-[52px] top-[20px] flex size-[38px] items-center justify-center rounded-full border border-line bg-white text-primary shadow-soft transition-colors hover:text-gold-dark"
      >
        <CloseIcon size={13} />
      </button>

      <div className="flex h-full flex-col" onClick={closeOnLinkClick(closeDrawer)}>
        <div className="shrink-0 border-b border-line px-[28px] pb-[18px] pt-[26px] text-center">
          <span aria-hidden="true" className="mx-auto flex size-[46px] items-center justify-center rounded-full bg-cream text-gold-dark">
            <Icon name="cart" size={21} strokeWidth={1.6} />
          </span>
          <h2 id="mini-cart-title" className="mt-[12px] font-heading text-[26px] font-semibold leading-[1.15] text-primary">
            Shopping Cart
          </h2>
          <span aria-hidden="true" className="gold-line mx-auto mt-[10px]" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[28px] pt-[16px]" aria-busy={busy || loading}>
          {cart?.notices.map((n) => (
            <p key={n} role="status" className="mb-[12px] rounded-[10px] border-l-4 border-gold bg-cream-light px-[12px] py-[9px] text-[13px] text-ink">
              {n}
            </p>
          ))}

          {loading && !cart ? (
            <p className="py-[30px] text-center text-[14px] text-muted">Loading your cart…</p>
          ) : items.length === 0 ? (
            <div className="py-[34px] text-center">
              <p className="font-heading text-[19px] italic text-muted">No products in the cart.</p>
              <Link href={routes.shop} className="btn btn-primary mt-[20px]">
                Return To Shop
              </Link>
            </div>
          ) : (
            <ul className={`transition-opacity motion-reduce:transition-none ${busy ? "opacity-60" : ""}`}>
              {items.map((line) => {
                const title = `${line.name}${line.variationLabel ? ` - ${line.variationLabel}` : ""}`;
                return (
                  <li key={line.variationId} className="relative flex gap-[14px] border-b border-line py-[14px] pr-[24px] last:border-b-0">
                    <Link href={line.href} className="relative block size-[76px] shrink-0 overflow-hidden rounded-[12px] border border-gold/20 bg-cream-light" tabIndex={-1} aria-hidden="true">
                      {line.image ? <Image src={line.image} alt="" fill sizes="76px" className="object-contain p-[6px] mix-blend-multiply" /> : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={line.href} className="line-clamp-2 font-heading text-[16px] font-semibold leading-[1.3] !text-primary transition-colors hover:!text-gold-dark">
                        {title}
                      </Link>
                      {!line.inStock && <p className="mt-[2px] text-[12px] text-danger">Out of stock</p>}
                      <div className="mt-[9px] flex items-center gap-[8px] text-[14px] text-body">
                        <QtyStepper line={line} disabled={busy} />
                        <span aria-hidden="true" className="text-muted">
                          ×
                        </span>
                        <span className="font-bold text-primary">
                          <span className="sr-only">Price each: </span>
                          {formatPaise(line.unitPricePaise)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(line.variationId)}
                      disabled={busy}
                      aria-label={`Remove ${title} from cart`}
                      className="absolute right-[-4px] top-[12px] flex size-[26px] items-center justify-center rounded-full text-muted transition-colors hover:bg-cream hover:text-primary disabled:opacity-40"
                    >
                      <CloseIcon size={11} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && cart && (
          <div className="shrink-0 border-t border-line bg-cream-light px-[28px] pb-[24px]">
            <div className="flex items-center justify-between py-[16px]">
              <span className="text-[15px] font-semibold text-ink">Subtotal:</span>
              <span className="text-[18px] font-bold text-primary">{formatPaise(cart.subtotalPaise)}</span>
            </div>

            {free?.thresholdPaise ? (
              <div className="text-[13px] text-body" aria-live="polite">
                {free.reached ? (
                  <p>Congratulations! You&apos;ve got free shipping.</p>
                ) : (
                  <p>
                    Spend <strong className="text-gold-dark">{formatPaise(free.remainingPaise)}</strong> to get free shipping
                  </p>
                )}
                <div className="mt-[7px] h-[6px] overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Progress to free shipping" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${free.reached ? "bg-success" : "bg-gold"}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="mt-[18px] grid gap-[10px]">
              <Link href={routes.cart} className="btn btn-outline h-[46px] !py-0">
                View cart
              </Link>
              <Link href={routes.checkout} className="btn btn-primary h-[46px] !py-0">
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

/** Header cart button: green pill with the item count (gold-light badge). Opens the drawer above. */
export function CartButton({ className = "" }: { className?: string }) {
  const { cart, openDrawer } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Shopping cart, ${count} item${count === 1 ? "" : "s"}`}
      aria-haspopup="dialog"
      className={`flex h-[40px] items-center gap-[7px] rounded-full bg-primary pl-[13px] pr-[6px] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(15,69,38,0.15)] transition-[background-color,box-shadow,translate] duration-200 hover:-translate-y-px hover:bg-primary-dark hover:shadow-[0_10px_24px_rgba(15,69,38,0.2)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 min-[1025px]:h-[44px] min-[1025px]:pl-[16px] min-[1025px]:pr-[7px] ${className}`}
    >
      <Icon name="cart" size={18} strokeWidth={1.8} />
      <span aria-hidden="true" className="hidden min-[1025px]:inline">
        Cart
      </span>
      <span aria-hidden="true" className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-gold-light px-[7px] text-[12px] font-bold leading-none text-primary-dark min-[1025px]:h-[30px] min-[1025px]:min-w-[30px]">
        {count}
      </span>
    </button>
  );
}
