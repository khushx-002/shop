"use client";
/**
 * "Your order" lines and totals on the checkout page. The numbers come from the server
 * (POST /api/checkout/totals/), recalculated whenever the state / PIN code or a quantity changes.
 *
 * Like the old site: each line has a small − / + quantity box, and the Shipping row only appears
 * once a state + PIN code are entered. With no shipping method for the address it shows
 * WooCommerce's texts ("Enter your address ..." until street and city are filled in).
 * Heritage look: white rounded thumbnails, Playfair product names and total, `line` dividers
 * (the cream "Your order" box around it is in CheckoutForm).
 */
import Image from "next/image";
import { formatPaise } from "@/lib/pricing";
import type { CheckoutReview } from "@/lib/checkout/types";
import { QtyStepper } from "./QtyStepper";

type Props = {
  review: CheckoutReview;
  updating: boolean;
  onRemoveCoupon: () => void;
  couponBusy: boolean;
  /** street + city of the shipping address are filled in (changes the "no shipping" text) */
  addressFilled: boolean;
  onQtyChange: (variationId: number, qty: number) => void;
};

export function OrderReview({ review, updating, onRemoveCoupon, couponBusy, addressFilled, onQtyChange }: Props) {
  const row = "flex items-start justify-between gap-[16px] border-b border-line py-[14px]";
  const d = review.destination;
  return (
    <div className={`transition-opacity ${updating ? "opacity-60" : ""}`} aria-busy={updating}>
      <ul className="border-b border-line">
        {review.lines.map((l) => (
          <li key={l.variationId} className="flex gap-[16px] py-[16px]">
            <span className="relative block size-[68px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-white min-[480px]:size-[76px]">
              {l.image ? <Image src={l.image} alt={`${l.name}${l.variationLabel ? ` – ${l.variationLabel}` : ""}`} fill sizes="80px" className="object-contain p-[5px]" /> : <span className="absolute inset-0 bg-surface" />}
            </span>
            <div className="min-w-0 flex-1 text-[14px] leading-[1.45] text-ink">
              <p className="font-heading text-[16px] font-bold leading-[1.3] text-primary">{l.name}</p>
              <div className="mt-[8px] flex items-center text-body">
                <span className="mr-[7px]">
                  <QtyStepper value={l.qty} max={l.maxQty} label={`${l.name}${l.variationLabel ? ` – ${l.variationLabel}` : ""}`} onCommit={(q) => onQtyChange(l.variationId, q)} size="xs" />
                </span>
                × {formatPaise(l.unitPricePaise)}
              </div>
              {l.variationLabel && (
                <p className="mt-[6px]">
                  {l.attributeName}: <span className="text-muted">{l.variationLabel}</span>
                </p>
              )}
              <p className="mt-[4px]">
                Subtotal: <span className="font-bold text-primary">{formatPaise(l.lineTotalPaise)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className={row}>
        <span className="text-[15px] text-body">Subtotal</span>
        <span className="text-[15px] font-semibold text-ink">{formatPaise(review.subtotalPaise)}</span>
      </div>
      {review.coupon && (
        <div className={row}>
          <span className="text-[15px] text-body">Coupon: {review.coupon.code}</span>
          <span className="text-right text-[14px] font-semibold text-primary">
            {review.discountPaise > 0 ? `-${formatPaise(review.discountPaise)}` : "Free shipping coupon"}{" "}
            <button type="button" onClick={onRemoveCoupon} disabled={couponBusy} className="font-normal text-body underline underline-offset-2 transition-colors hover:text-danger disabled:opacity-50">
              [Remove]
            </button>
          </span>
        </div>
      )}
      {d && (
        <div className={row}>
          <span className="text-[15px] text-body">Shipping</span>
          <p className="max-w-[60%] text-right text-[14px] text-body">
            {review.shipping ? (
              <>
                {review.shipping.label}
                {review.shipping.costPaise > 0 && <>: {formatPaise(review.shipping.costPaise)}</>}
              </>
            ) : addressFilled ? (
              "There are no shipping options available. Please ensure that your address has been entered correctly, or contact us if you need any help."
            ) : (
              "Enter your address to view shipping options."
            )}
          </p>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-line py-[18px] text-primary">
        <span className="font-heading text-[22px] font-bold">Total</span>
        <span aria-live="polite" className="text-[22px] font-bold">
          {formatPaise(review.totalPaise)}
        </span>
      </div>
    </div>
  );
}
