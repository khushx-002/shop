"use client";
/**
 * Track-order form (Order ID + billing email) -> POST /api/track-order/ -> order status and details.
 * Heritage look: the form sits in a cream card (like the contact form); the answer shows below it.
 */
import { useId, useRef, useState } from "react";
import { Notice } from "@/components/checkout/Notice";
import { formatOrderDate, type OrderView } from "@/lib/account/format";
import { api } from "@/lib/routes";
import { OrderDetails } from "./OrderDetails";
import { BTN_DARK, FIELD_ERROR, INPUT, LABEL } from "./form-styles";

type Result = { ok: true; order: OrderView } | { ok: false; error: string };

export function TrackOrderForm() {
  const id = useId();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ orderId?: string; email?: string }>({});
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!orderId.trim()) next.orderId = "Please enter a valid order ID";
    if (!email.trim()) next.email = "Please enter a valid email address";
    setErrors(next);
    if (next.orderId || next.email) return;
    setPending(true);
    setResult(null);
    try {
      const res = await fetch(api.trackOrder, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
        cache: "no-store",
      });
      const data = (await res.json()) as Result;
      setResult(data.ok ? data : { ok: false, error: data.error || "Sorry, something went wrong. Please try again." });
    } catch {
      setResult({ ok: false, error: "Network error. Please check your connection and try again." });
    } finally {
      setPending(false);
      // Move focus to the answer so keyboard and screen-reader users hear it.
      window.setTimeout(() => resultRef.current?.focus(), 0);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate aria-describedby={`${id}-intro`} className="mx-auto max-w-[760px] rounded-[22px] border border-line bg-cream p-[22px] md:p-[36px]">
        <p id={`${id}-intro`} className="mb-[24px] text-[15px] leading-[1.6] text-body">
          To track your order please enter your Order ID in the box below and press the &quot;Track&quot; button. This was given to you on your receipt and in the confirmation
          email you should have received.
        </p>
        <div className="grid gap-x-[18px] md:grid-cols-2">
          <p className="mb-[22px]">
            <label htmlFor={`${id}-order`} className={LABEL}>
              Order ID
            </label>
            <input
              id={`${id}-order`}
              name="orderid"
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              maxLength={40}
              autoComplete="off"
              placeholder="Found in your order confirmation email."
              aria-invalid={errors.orderId ? true : undefined}
              aria-describedby={errors.orderId ? `${id}-order-error` : undefined}
              className={INPUT}
            />
            {errors.orderId && (
              <span id={`${id}-order-error`} className={FIELD_ERROR}>
                {errors.orderId}
              </span>
            )}
          </p>
          <p className="mb-[22px]">
            <label htmlFor={`${id}-email`} className={LABEL}>
              Billing email
            </label>
            <input
              id={`${id}-email`}
              name="order_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={190}
              autoComplete="email"
              placeholder="Email you used during checkout."
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
              className={INPUT}
            />
            {errors.email && (
              <span id={`${id}-email-error`} className={FIELD_ERROR}>
                {errors.email}
              </span>
            )}
          </p>
        </div>
        <button type="submit" disabled={pending} aria-busy={pending} className={`${BTN_DARK} sm:w-auto sm:min-w-[160px] sm:px-[32px]`}>
          {pending ? "Tracking…" : "Track"}
        </button>
      </form>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" className="mx-auto mt-[36px] max-w-[960px] outline-none">
        {result && !result.ok && <Notice kind="error">{result.error}</Notice>}
        {result?.ok && (
          <div>
            <p className="mb-[28px] rounded-[14px] border border-line bg-cream-light px-[18px] py-[14px] text-[15px] leading-[1.6] text-body">
              Order #<mark className="bg-transparent font-bold text-ink">{result.order.number}</mark> was placed on{" "}
              <mark className="bg-transparent font-bold text-ink">{formatOrderDate(result.order.createdAt)}</mark> and is currently{" "}
              <mark className="bg-transparent font-bold text-ink">{result.order.statusLabel}</mark>.
            </p>
            <OrderDetails order={result.order} />
          </div>
        )}
      </div>
    </>
  );
}
