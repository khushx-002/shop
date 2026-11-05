"use client";
/**
 * /cart/ page body: free-shipping progress, product list (stacked cards on phones), coupon box,
 * "Clear shopping cart", and the "Cart totals" summary box with the shipping calculator.
 * Heritage look: two columns on desktop – the items in a soft white box (cream rounded
 * thumbnails, thin `line` dividers, pill quantity steppers) and a cream "order summary" box
 * with a Playfair title and a full-width green "Proceed to checkout" button.
 * Quantities update automatically.
 * All numbers come from the server cart (useCart / CartView); the browser never computes totals.
 */
import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";
import { formatPaise } from "@/lib/pricing";
import { INDIAN_STATES, PINCODE_RE, stateName } from "@/lib/india";
import { routes } from "@/lib/routes";
import { SITE } from "@/lib/site";
import type { CartLine, CartView } from "@/lib/types";
import { Notice, type NoticeKind } from "./Notice";
import { QtyStepper } from "./QtyStepper";
import { CheckoutHeader } from "./CheckoutHeader";
import { SafeCheckoutBox } from "./SafeCheckoutBox";
import { StepsBar } from "./StepsBar";

type Message = { kind: NoticeKind; text: string } | null;

const textLink = "font-semibold text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark";

/* ---------- free shipping progress ---------- */
export function FreeShippingProgress({ cart }: { cart: CartView }) {
  const f = cart.freeShipping;
  if (!f.thresholdPaise) return null;
  const pct = Math.min(100, Math.max(0, Math.round(((f.thresholdPaise - f.remainingPaise) / f.thresholdPaise) * 100)));
  return (
    <div className="rounded-[16px] border border-line bg-cream-light px-[18px] py-[16px] text-[15px] text-ink md:px-[22px]" aria-live="polite">
      <p className="flex items-center gap-[10px]">
        <span aria-hidden="true" className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-gold/30 bg-white text-gold-dark">
          <Icon name="truck" size={17} />
        </span>
        {f.reached ? (
          <span className="font-semibold text-primary">Congratulations! You&apos;ve got free shipping.</span>
        ) : (
          <span>
            Spend <strong className="text-[16px] font-bold text-primary">{formatPaise(f.remainingPaise)}</strong> to get free shipping
          </span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-[12px] h-[10px] w-full overflow-hidden rounded-full bg-line bg-[length:30px_30px] bg-[linear-gradient(135deg,rgba(255,255,255,.55)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.55)_50%,rgba(255,255,255,.55)_75%,transparent_75%,transparent)] motion-safe:animate-[progress-move_2s_linear_infinite_reverse]"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <style>{`@keyframes progress-move{from{background-position:0 0}to{background-position:30px 30px}}`}</style>
    </div>
  );
}

/* ---------- empty cart ---------- */
function EmptyCart() {
  return (
    <>
      <StepsBar active={1} variant="plain" />
      {/* data-no-footer-badge: the old empty cart had no "Guaranteed Safe Checkout" strip above the footer (globals.css) */}
      <section data-no-footer-badge="" className="site-container pb-[110px] pt-[48px] text-center min-[993px]:pb-[140px] min-[993px]:pt-[64px]">
        <span aria-hidden="true" className="mx-auto flex size-[88px] items-center justify-center rounded-full border border-gold/30 bg-cream text-gold-dark">
          <Icon name="cart" size={38} strokeWidth={1.4} />
        </span>
        <h1 className="mt-[22px] font-heading text-[clamp(28px,4vw,40px)] font-bold leading-[1.2] text-primary">Your shopping cart is empty</h1>
        <span aria-hidden="true" className="gold-line mx-auto mt-[16px]" />
        <p className="mx-auto mt-[14px] max-w-[520px] text-[16px] leading-[1.65] text-body">We invite you to get acquainted with an assortment of our shop. Surely you can find something for yourself!</p>
        <Link href={routes.shop} className="btn btn-primary mt-[26px] px-[30px]">
          Return To Shop
        </Link>
      </section>
    </>
  );
}

/* ---------- shipping calculator ---------- */
function ShippingCalculator({ cart, onDone }: { cart: CartView; onDone: (m: Message) => void }) {
  const { setShipping, busy } = useCart();
  const id = useId();
  const dest = cart.shipping.destination;
  const [state, setState] = useState(dest?.state ?? "");
  const [pin, setPin] = useState(dest?.postcode ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = pin.replace(/\s+/g, "");
    if (!state) return setError("Please select a state.");
    if (!PINCODE_RE.test(p)) return setError("Please enter a valid 6-digit PIN code.");
    setError(null);
    const r = await setShipping(state, p);
    if (r.ok) onDone({ kind: "success", text: "Shipping costs updated." });
    else setError(r.error ?? "Could not update shipping.");
  };

  return (
    <form onSubmit={submit} className="mt-[12px] grid gap-[10px] rounded-[14px] border border-line bg-white p-[14px] text-left" noValidate>
      <p className="text-[14px] text-ink">
        <span className="text-muted">Country / Region:</span> India
      </p>
      <div>
        <label htmlFor={`${id}-state`} className="sr-only">
          State
        </label>
        <select id={`${id}-state`} value={state} onChange={(e) => setState(e.target.value)} className="field !py-[9px] !text-[14px]" aria-invalid={error?.includes("state") || undefined}>
          <option value="">Select an option…</option>
          {INDIAN_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-pin`} className="sr-only">
          PIN Code
        </label>
        <input
          id={`${id}-pin`}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={7}
          placeholder="PIN Code"
          className="field !py-[9px] !text-[14px] placeholder:text-muted"
          aria-invalid={error?.includes("PIN") || undefined}
        />
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn btn-outline h-[42px] py-0">
        Update
      </button>
    </form>
  );
}

function ShippingCell({ cart, onMessage }: { cart: CartView; onMessage: (m: Message) => void }) {
  const [open, setOpen] = useState(false);
  const s = cart.shipping;
  const dest = s.destination;
  const toggle = (
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`mt-[6px] text-[14px] ${textLink}`}>
      {dest ? "Change address" : "Calculate shipping"}
    </button>
  );
  return (
    <div className="text-right text-[14px] text-muted">
      {dest && !s.available ? (
        <p className="text-ink">
          No shipping options were found for <strong>{dest.postcode}</strong>. Please contact us at{" "}
          <a href={`mailto:${SITE.email}`} className="underline">
            {SITE.email}
          </a>
          .
        </p>
      ) : s.selected ? (
        <>
          <p className="font-semibold text-ink">
            {s.selected.label}
            {s.selected.costPaise > 0 && <>: {formatPaise(s.selected.costPaise)}</>}
          </p>
          {dest ? (
            <p className="mt-[4px]">
              Shipping to{" "}
              <strong className="font-semibold text-ink">
                {stateName(dest.state)} {dest.postcode}
              </strong>
              .
            </p>
          ) : (
            <p className="mt-[4px]">Shipping options will be updated during checkout.</p>
          )}
        </>
      ) : null}
      {toggle}
      {open && (
        <ShippingCalculator
          cart={cart}
          onDone={(m) => {
            setOpen(false);
            onMessage(m);
          }}
        />
      )}
    </div>
  );
}

/* ---------- totals box ("order summary") ---------- */
function CartTotals({ cart, onMessage }: { cart: CartView; onMessage: (m: Message) => void }) {
  const { removeCoupon, busy } = useCart();
  const row = "flex items-start justify-between gap-[16px] border-b border-line py-[14px]";
  return (
    <section aria-labelledby="cart-totals-title" className="rounded-[20px] border border-line bg-cream p-[20px] min-[480px]:p-[26px]">
      <h2 id="cart-totals-title" className="font-heading text-[24px] font-bold leading-[1.2] text-primary">
        Cart totals
      </h2>
      <span aria-hidden="true" className="gold-line mb-[6px] mt-[12px]" />
      <div className={row}>
        <span className="text-[15px] text-body">Subtotal</span>
        <span className="text-[15px] font-semibold text-ink">{formatPaise(cart.subtotalPaise)}</span>
      </div>
      {cart.coupon && (
        <div className={row}>
          <span className="text-[15px] text-body">Coupon: {cart.coupon.code}</span>
          <span className="text-right text-[14px] font-semibold text-primary">
            {cart.discountPaise > 0 ? `-${formatPaise(cart.discountPaise)}` : cart.coupon.freeShipping ? "Free shipping coupon" : formatPaise(0)}{" "}
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const r = await removeCoupon();
                onMessage(r.ok ? { kind: "success", text: "Coupon has been removed." } : { kind: "error", text: r.error ?? "Could not remove the coupon." });
              }}
              className="font-normal text-body underline underline-offset-2 transition-colors hover:text-danger"
            >
              [Remove]
            </button>
          </span>
        </div>
      )}
      <div className={row}>
        <span className="text-[15px] text-body">Shipping</span>
        <ShippingCell cart={cart} onMessage={onMessage} />
      </div>
      <div className="flex items-center justify-between py-[18px] text-primary">
        <span className="font-heading text-[22px] font-bold">Total</span>
        <span className="text-[22px] font-bold">{formatPaise(cart.totalPaise)}</span>
      </div>
      <Link href={routes.checkout} aria-disabled={busy || undefined} className="btn btn-primary h-[50px] w-full text-[15px] aria-disabled:pointer-events-none aria-disabled:opacity-60">
        Proceed to checkout
        <Icon name="chevron-right" size={14} />
      </Link>
      <Link href={routes.shop} className="btn btn-outline mt-[10px] h-[46px] w-full">
        Continue shopping
      </Link>
    </section>
  );
}

/* ---------- one product ---------- */
function CartRow({ line, sku, onMessage }: { line: CartLine; sku: string | null; onMessage: (m: Message) => void }) {
  const { updateItem, removeItem, busy } = useCart();
  const title = `${line.name}${line.variationLabel ? ` – ${line.variationLabel}` : ""}`;
  const remove = async () => {
    const r = await removeItem(line.variationId);
    if (r.ok) onMessage({ kind: "success", text: `“${title}” removed.` });
  };
  const stepper = <QtyStepper value={line.qty} max={line.maxQty} label={title} onCommit={(q) => void updateItem(line.variationId, q)} />;
  const image = (
    <Link href={line.href} tabIndex={-1} aria-hidden="true" className="relative block size-[76px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-cream-light min-[769px]:size-[88px]">
      {line.image ? <Image src={line.image} alt="" fill sizes="88px" className="object-contain p-[6px]" /> : <span className="absolute inset-0 bg-surface" />}
    </Link>
  );
  const removeBtn = (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label={`Remove ${title} from cart`}
      className="inline-flex items-center gap-[4px] text-[13px] text-body underline underline-offset-2 transition-colors hover:text-danger disabled:opacity-50"
    >
      <Icon name="trash" size={13} />
      Remove
    </button>
  );
  const attr = line.variationLabel ? (
    <p className="text-[13px] text-muted">
      {line.attributeName}: <span className="font-semibold text-ink">{line.variationLabel}</span>
    </p>
  ) : null;

  return (
    <>
      {/* desktop / tablet: table row */}
      <tr className="hidden border-b border-line align-middle min-[769px]:table-row [&:nth-last-child(2)]:border-b-0">
        <td className="py-[18px] pr-[12px]">
          <div className="flex items-center gap-[18px]">
            {image}
            <div className="grid content-start gap-[5px]">
              <Link href={line.href} className="font-heading text-[18px] font-bold leading-[1.3] !text-primary transition-colors hover:!text-gold-dark">
                {line.name}
              </Link>
              {attr}
              <div>{removeBtn}</div>
            </div>
          </div>
        </td>
        <td className="px-[8px] py-[18px] text-center text-[15px] text-ink">{formatPaise(line.unitPricePaise)}</td>
        <td className="whitespace-nowrap px-[8px] py-[18px] text-center text-[13px] text-muted">{sku || "N/A"}</td>
        <td className="px-[8px] py-[18px] text-center">{stepper}</td>
        <td className="py-[18px] pl-[8px] text-right text-[16px] font-bold text-primary">{formatPaise(line.lineTotalPaise)}</td>
      </tr>
      {/* phone: stacked card */}
      <tr className="block border-b border-line py-[18px] last:border-b-0 last:pb-[6px] min-[769px]:hidden [&:nth-child(2)]:pt-[6px]">
        <td className="flex gap-[14px]">
          {image}
          <div className="min-w-0 flex-1 text-[13px]">
            <Link href={line.href} className="block font-heading text-[17px] font-bold leading-[1.3] !text-primary">
              {line.name}
            </Link>
            {attr && <div className="pt-[4px]">{attr}</div>}
            <div className="flex items-center gap-[8px] py-[10px] text-muted">
              {stepper}
              <span aria-hidden="true">×</span>
              <span>{formatPaise(line.unitPricePaise)}</span>
            </div>
            <div className="flex items-center justify-between gap-[10px]">
              <p className="text-ink">
                Subtotal: <span className="text-[15px] font-bold text-primary">{formatPaise(line.lineTotalPaise)}</span>
              </p>
              {removeBtn}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

/* ---------- coupon ---------- */
function CouponForm({ onMessage }: { onMessage: (m: Message) => void }) {
  const { applyCoupon, busy } = useCart();
  const [code, setCode] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return onMessage({ kind: "error", text: "Please enter a coupon code." });
    const r = await applyCoupon(code.trim());
    if (r.ok) {
      setCode("");
      onMessage({ kind: "success", text: r.message ?? "Coupon code applied successfully." });
    } else onMessage({ kind: "error", text: r.error ?? "Could not apply the coupon." });
  };
  return (
    <form onSubmit={submit} className="flex w-full gap-[8px] min-[769px]:w-[360px]">
      <label htmlFor="cart-coupon" className="sr-only">
        Coupon code
      </label>
      <input
        id="cart-coupon"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Coupon code"
        autoComplete="off"
        maxLength={40}
        className="field h-[44px] min-w-0 flex-1 py-0 placeholder:text-muted"
      />
      <button type="submit" disabled={busy} aria-label="Apply coupon" className="btn btn-outline h-[44px] shrink-0 px-[18px] py-0">
        Apply
      </button>
    </form>
  );
}

/* ---------- page ---------- */
export function CartPage({ initialCart, skus }: { initialCart: CartView; skus: Record<number, string> }) {
  const { cart: live, removeItem, busy, loading } = useCart();
  const cart = live ?? initialCart;
  const [message, setMessage] = useState<Message>(null);

  if (!cart.items.length && !(loading && initialCart.items.length)) {
    return (
      <>
        {message && (
          <div className="site-container pt-[20px]">
            <Notice kind={message.kind}>{message.text}</Notice>
          </div>
        )}
        <EmptyCart />
      </>
    );
  }

  const clearAll = async () => {
    for (const l of cart.items) {
      const r = await removeItem(l.variationId);
      if (!r.ok) return;
    }
    setMessage({ kind: "success", text: "Your cart has been cleared." });
  };

  return (
    <>
      <CheckoutHeader active={1} />
      <div className="bg-cream-light">
        <div className="site-container pb-[64px] pt-[32px] min-[993px]:pb-[88px] min-[993px]:pt-[44px]">
          <h1 className="sr-only">Cart</h1>
          <div aria-live="polite" className="grid gap-[12px] empty:hidden [&:not(:empty)]:mb-[24px]">
            {message && <Notice kind={message.kind}>{message.text}</Notice>}
            {cart.notices.map((n) => (
              <Notice key={n} kind="info">
                {n}
              </Notice>
            ))}
          </div>

          <div className="flex flex-col gap-[24px] min-[993px]:flex-row min-[993px]:items-start min-[993px]:gap-[32px]">
            <div className={`min-w-0 flex-1 transition-opacity ${busy ? "opacity-70" : ""}`} aria-busy={busy}>
              <FreeShippingProgress cart={cart} />

              <div className="card-soft mt-[20px] px-[16px] py-[8px] shadow-soft min-[769px]:px-[24px] min-[769px]:py-[10px]">
                <table className="w-full border-collapse">
                  <caption className="sr-only">Products in your cart</caption>
                  <thead className="hidden min-[769px]:table-header-group">
                    <tr className="border-b border-line text-[12px] uppercase tracking-[0.12em] text-muted">
                      <th scope="col" className="py-[14px] text-left font-bold">
                        Product
                      </th>
                      <th scope="col" className="px-[8px] py-[14px] text-center font-bold">
                        Price
                      </th>
                      <th scope="col" className="px-[8px] py-[14px] text-center font-bold">
                        SKU
                      </th>
                      <th scope="col" className="px-[8px] py-[14px] text-center font-bold">
                        Quantity
                      </th>
                      <th scope="col" className="py-[14px] pl-[8px] text-right font-bold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="block min-[769px]:table-row-group">
                    {cart.items.map((line) => (
                      <CartRow key={line.variationId} line={line} sku={skus[line.variationId] ?? null} onMessage={setMessage} />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-[18px] grid items-center gap-[12px] min-[769px]:grid-cols-[auto_auto] min-[769px]:justify-between">
                <CouponForm onMessage={setMessage} />
                <button type="button" onClick={clearAll} disabled={busy} className="btn btn-outline h-[44px] py-0 text-[13px]">
                  <Icon name="trash" size={14} />
                  Clear shopping cart
                </button>
              </div>
            </div>

            <aside className="w-full shrink-0 min-[993px]:w-[38%] min-[1200px]:w-[36%]">
              <CartTotals cart={cart} onMessage={setMessage} />
              <SafeCheckoutBox className="mt-[16px]" />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
