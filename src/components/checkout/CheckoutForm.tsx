"use client";
/**
 * Checkout page body: login / coupon toggles, billing + shipping form, order notes,
 * "Your order" review with live shipping, payment methods and "Place order".
 *
 * Place order:  validate here (fast feedback) -> POST /api/checkout/ (server validates again and
 * recomputes totals) -> Razorpay popup -> POST /api/checkout/verify/ -> thank-you page.
 * Cash on delivery (only for addresses whose zone allows it): POST /api/checkout/ -> thank-you page.
 *
 * Payment box like the old site: "Sorry! COD ..." notice for zones without COD, a radio per method
 * (hidden when there is only one), the chosen method's text below it.
 * Heritage look: form sections are soft white cards with Playfair headings and `.field` inputs;
 * "Your order" is a cream box; payment methods are bordered radio cards (selected = green border).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { api, routes } from "@/lib/routes";
import { isCompleteDestination, shippingDestination, validateCheckoutFields } from "@/lib/checkout/validation";
import { PAYMENT_METHODS, RAZORPAY_LOGO_URL, type PaymentMethodId } from "@/lib/checkout/payment-methods";
import { Icon } from "@/components/ui/Icon";
import type { AddressInput, CheckoutApiResponse, CheckoutInput, CheckoutReview, FieldErrors, PaymentParams, TotalsApiResponse } from "@/lib/checkout/types";
import { AddressFields } from "./AddressFields";
import { CouponToggle, LoginToggle } from "./CheckoutToggles";
import { Notice, type NoticeKind } from "./Notice";
import { OrderReview } from "./OrderReview";
import { SafeCheckoutBox } from "./SafeCheckoutBox";
import { loadRazorpay, openRazorpay, verifyPayment } from "./razorpay-client";

const TOTALS_URL = "/api/checkout/totals/";

type FormState = Omit<CheckoutInput, "expected" | "paymentMethod">;
type Props = {
  initialReview: CheckoutReview;
  prefill: { billing: AddressInput; shipping: AddressInput | null };
  loggedIn: boolean;
  paymentsEnabled: boolean;
  notConfiguredMessage: string;
};
type TopMessage = { kind: NoticeKind; text: string; list?: string[] } | null;
type Phase = "idle" | "placing" | "paying" | "verifying" | "done";

const sectionTitle = "mb-[20px] border-b border-line pb-[14px] font-heading text-[22px] font-bold leading-[1.2] text-primary md:text-[24px]";
const sectionCard = "card-soft p-[20px] shadow-soft min-[480px]:p-[26px] min-[993px]:p-[32px]";
const checkLabel = "flex cursor-pointer items-center gap-[10px] text-[15px] text-ink";
const destKey = (d: { state: string; postcode: string } | null) => (d ? `${d.state}|${d.postcode}` : "");

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function CheckoutForm({ initialReview, prefill, loggedIn, paymentsEnabled, notConfiguredMessage }: Props) {
  const router = useRouter();
  const { removeCoupon, updateItem, busy: cartBusy } = useCart();
  const [form, setForm] = useState<FormState>(() => ({
    billing: prefill.billing,
    shipToDifferent: false,
    shipping: prefill.shipping ?? { ...prefill.billing, phone: "", email: "" },
    createAccount: false,
    orderNotes: "",
    reviewConsent: false,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [review, setReview] = useState<CheckoutReview>(initialReview);
  const [updating, setUpdating] = useState(false);
  const [top, setTop] = useState<TopMessage>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [submitted, setSubmitted] = useState(false); // after the first "Place order" click every change is re-checked
  const [method, setMethod] = useState<PaymentMethodId>("razorpay"); // the old site starts on Razorpay too
  const seq = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  const dest = useMemo(() => shippingDestination(form), [form]);
  const complete = isCompleteDestination(dest);
  const shipAddress = form.shipToDifferent ? form.shipping : form.billing;
  const addressFilled = !!shipAddress.address1.trim() && !!shipAddress.city.trim();

  /** Asks the server for the "Your order" totals for an address. Only the newest answer is used. */
  const refreshTotals = useCallback(async (d: { state: string; postcode: string }, email: string): Promise<CheckoutReview | null> => {
    const mine = ++seq.current;
    setUpdating(true);
    const data = await postJson<TotalsApiResponse>(TOTALS_URL, { state: d.state, postcode: d.postcode, email });
    if (mine !== seq.current) return null;
    setUpdating(false);
    if (data?.ok) {
      setReview(data.review);
      return data.review;
    }
    return null;
  }, []);

  // Recalculate shipping shortly after the state or PIN code changes.
  const reviewKey = destKey(review.destination);
  // Cash on delivery only when the totals on screen belong to the address in the form.
  const reviewFresh = complete && destKey(dest) === reviewKey;
  const codShown = reviewFresh && review.payment.cod;
  const codNotice = reviewFresh ? review.payment.codNotice : null;
  const chosen: PaymentMethodId = method === "cod" && codShown ? "cod" : "razorpay";
  const methods: PaymentMethodId[] = codShown ? ["cod", "razorpay"] : ["razorpay"];
  const single = methods.length === 1;
  const canPay = chosen === "cod" || paymentsEnabled;
  useEffect(() => {
    if (!complete || destKey(dest) === reviewKey) return;
    const t = window.setTimeout(() => void refreshTotals(dest, form.billing.email), 450);
    return () => window.clearTimeout(t);
  }, [complete, dest, reviewKey, refreshTotals, form.billing.email]);

  // An empty cart (e.g. emptied in another tab) has nothing to check out.
  useEffect(() => {
    if (!review.lines.length && phase === "idle") router.replace(routes.cart);
  }, [review.lines.length, phase, router]);

  // Warm up the Razorpay script once the customer starts filling the form.
  const warmed = useRef(false);
  const warmUp = () => {
    if (!paymentsEnabled || warmed.current) return;
    warmed.current = true;
    loadRazorpay().catch(() => {
      warmed.current = false;
    });
  };

  /** Updates the form; after the first "Place order" click every change is re-checked at once. */
  const update = (change: (f: FormState) => FormState) => {
    const next = change(form);
    setForm(next);
    if (submitted) setErrors(validateCheckoutFields(next));
  };

  const setAddress = (which: "billing" | "shipping") => (field: keyof AddressInput, value: string) => update((f) => ({ ...f, [which]: { ...f[which], [field]: value } }));

  const blurAddress = (which: "billing" | "shipping") => (field: keyof AddressInput) => {
    // After the first submit every change is checked; before that, check a field when it is left.
    if (submitted) return;
    const all = validateCheckoutFields(form);
    const key = `${which}.${field}`;
    setErrors((e) => {
      const next = { ...e };
      if (all[key] && String(form[which][field]).trim()) next[key] = all[key];
      else delete next[key];
      return next;
    });
  };

  const showTop = (m: TopMessage) => {
    setTop(m);
    window.setTimeout(() => topRef.current?.focus(), 0);
  };

  const onCouponChange = async (m: { kind: "success" | "error"; text: string }) => {
    setTop({ kind: m.kind, text: m.text });
    if (m.kind === "success") await refreshTotals(dest, form.billing.email);
  };

  const onRemoveCoupon = async () => {
    const r = await removeCoupon();
    setTop(r.ok ? { kind: "success", text: "Coupon has been removed." } : { kind: "error", text: r.error ?? "Could not remove the coupon." });
    await refreshTotals(dest, form.billing.email);
  };

  /** − / + in "Your order": change the cart, then recalculate the box (shipping can change with the total). */
  const onQtyChange = async (variationId: number, qty: number) => {
    const r = await updateItem(variationId, qty);
    if (r.ok) await refreshTotals(dest, form.billing.email);
  };

  const pay = async (payment: PaymentParams) => {
    setPhase("paying");
    let result;
    try {
      result = await openRazorpay(payment);
    } catch (err) {
      setPhase("idle");
      setPayError(err instanceof Error ? err.message : "Could not open the payment window.");
      return;
    }
    if (result.kind === "dismissed") {
      setPhase("idle");
      setPayError(`Payment was cancelled / failed. You can try again.${result.failure ? ` (${result.failure})` : ""}`);
      return;
    }
    setPhase("verifying");
    const v = await verifyPayment(payment.orderNumber, result.response);
    if (v.ok) {
      setPhase("done");
      router.push(v.redirect);
      return;
    }
    setPhase("idle");
    setPayError(v.error);
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "idle" || !canPay) return;
    setSubmitted(true);
    setPayError(null);
    const fieldErrors = validateCheckoutFields(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      showTop({ kind: "error", text: "Please correct the following:", list: Object.values(fieldErrors) });
      return;
    }
    setPhase("placing");
    // Make sure the totals on screen belong to the address in the form before sending them.
    let current = review;
    if (destKey(dest) !== destKey(review.destination)) current = (await refreshTotals(dest, form.billing.email)) ?? review;
    if (!current.shippingAvailable) {
      setPhase("idle");
      showTop({ kind: "error", text: `No shipping options were found for ${dest.postcode}. Please contact us at info@jivo.in.` });
      return;
    }
    const body: CheckoutInput = {
      ...form,
      paymentMethod: chosen,
      expected: { lines: current.lines.map((l) => ({ variationId: l.variationId, qty: l.qty, unitPricePaise: l.unitPricePaise })), totalPaise: current.totalPaise },
    };
    const data = await postJson<CheckoutApiResponse>(api.checkout, body);
    if (!data) {
      setPhase("idle");
      showTop({ kind: "error", text: "Network error. Please check your connection and try again." });
      return;
    }
    if (data.ok) {
      setTop(null);
      if (data.redirect !== undefined) {
        // cash on delivery: the order is placed
        setPhase("done");
        router.push(data.redirect);
        return;
      }
      await pay(data.payment);
      return;
    }
    setPhase("idle");
    if (data.review) setReview(data.review);
    if (data.code === "empty") {
      router.replace(routes.cart);
      return;
    }
    if (data.fieldErrors) setErrors(data.fieldErrors);
    showTop({ kind: "error", text: data.error, list: data.fieldErrors && data.code === "validation" ? Object.values(data.fieldErrors) : undefined });
  };

  const placing = phase !== "idle";
  const buttonText = phase === "placing" ? "Placing order…" : phase === "paying" ? "Waiting for payment…" : phase === "verifying" || phase === "done" ? "Confirming payment…" : "Place order";

  return (
    <div className="bg-cream-light">
      <div className="site-container pb-[64px] pt-[32px] min-[993px]:pb-[88px] min-[993px]:pt-[44px]" onFocusCapture={warmUp}>
        <h1 className="sr-only">Checkout</h1>
        <div ref={topRef} tabIndex={-1} aria-live="polite" className="outline-none">
          {top && (
            <Notice kind={top.kind} className="mb-[30px]">
              <p>{top.text}</p>
              {top.list && (
                <ul className="mt-[4px] list-disc pl-[18px]">
                  {top.list.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </Notice>
          )}
          {review.notices.map((n) => (
            <Notice key={n} kind="info" className="mb-[20px]">
              {n}
            </Notice>
          ))}
        </div>

        <div className="grid gap-[12px]">
          {!loggedIn && <LoginToggle />}
          <CouponToggle onApplied={onCouponChange} />
        </div>

        <form onSubmit={placeOrder} noValidate className="mt-[24px] flex flex-col gap-[24px] min-[993px]:flex-row min-[993px]:items-start min-[993px]:gap-[32px]" aria-label="Checkout">
          <div className="grid min-w-0 flex-1 gap-[20px]">
            <section aria-labelledby="billing-title" className={sectionCard}>
              <h2 id="billing-title" className={sectionTitle}>
                Billing details
              </h2>
              <AddressFields prefix="billing" value={form.billing} errors={errors} onChange={setAddress("billing")} onBlur={blurAddress("billing")} withContact />
            </section>

            {!loggedIn && (
              <section aria-labelledby="new-customer-title" className={sectionCard}>
                <h2 id="new-customer-title" className={sectionTitle}>
                  New customer
                </h2>
                <label className={checkLabel}>
                  <input type="checkbox" checked={form.createAccount} onChange={(e) => update((f) => ({ ...f, createAccount: e.target.checked }))} className="size-[16px] accent-primary" />
                  Create an account?
                </label>
                {form.createAccount && <p className="mt-[10px] text-[14px] text-muted">A link to set a new password will be sent to your email address.</p>}
              </section>
            )}

            <section aria-labelledby="shipping-title" className={sectionCard}>
              <h2 id="shipping-title" className={sectionTitle}>
                Shipping address
              </h2>
              <label className={checkLabel}>
                <input
                  type="checkbox"
                  checked={form.shipToDifferent}
                  onChange={(e) => update((f) => ({ ...f, shipToDifferent: e.target.checked }))}
                  aria-controls="shipping-fields"
                  aria-expanded={form.shipToDifferent}
                  className="size-[16px] accent-primary"
                />
                Ship to a different address?
              </label>
              {form.shipToDifferent && (
                <div id="shipping-fields" className="mt-[22px]">
                  <AddressFields prefix="shipping" value={form.shipping} errors={errors} onChange={setAddress("shipping")} onBlur={blurAddress("shipping")} withContact={false} />
                </div>
              )}
            </section>

            <section aria-labelledby="additional-title" className={sectionCard}>
              <h2 id="additional-title" className={sectionTitle}>
                Additional information
              </h2>
              <label htmlFor="order_comments" className="label">
                Order Notes (optional)
              </label>
              <textarea
                id="order_comments"
                name="order_comments"
                rows={3}
                maxLength={1000}
                value={form.orderNotes}
                onChange={(e) => update((f) => ({ ...f, orderNotes: e.target.value }))}
                placeholder="Notes about your order, e.g. special notes for delivery."
                aria-invalid={errors.orderNotes ? true : undefined}
                className="field min-h-[96px] resize-y leading-[1.5] placeholder:text-muted"
              />
              {errors.orderNotes && <span className="mt-[6px] block text-[13px] text-danger">{errors.orderNotes}</span>}
            </section>
          </div>

          <aside className="w-full shrink-0 min-[993px]:w-[40%]" aria-labelledby="order-review-title">
            <div className="rounded-[20px] border border-line bg-cream p-[20px] min-[480px]:p-[26px]">
              <h2 id="order-review-title" className="font-heading text-[24px] font-bold leading-[1.2] text-primary">
                Your order
              </h2>
              <span aria-hidden="true" className="gold-line mb-[4px] mt-[12px]" />
              <OrderReview review={review} updating={updating} onRemoveCoupon={onRemoveCoupon} couponBusy={cartBusy} addressFilled={addressFilled} onQtyChange={onQtyChange} />

              <div className="pt-[20px]">
                {codNotice && (
                  <p role="status" className="relative mb-[18px] rounded-[12px] border-l-[4px] border-gold bg-white py-[12px] pl-[42px] pr-[16px] text-[15px] leading-[1.5] text-ink">
                    <Icon name="info" size={17} className="absolute left-[15px] top-[14px] text-gold-dark" />
                    {codNotice}
                  </p>
                )}
                <fieldset className="mb-[20px]">
                  <legend className="mb-[10px] text-[13px] font-bold uppercase tracking-[0.12em] text-primary">Payment method</legend>
                  <ul className="grid gap-[10px]">
                    {methods.map((m) => {
                      const on = chosen === m;
                      return (
                        <li
                          key={m}
                          className={`rounded-[12px] border px-[14px] py-[12px] transition-colors ${on ? "border-primary bg-cream-light shadow-[inset_0_0_0_1px_var(--color-primary)]" : "border-line bg-white hover:border-primary/40"}`}
                        >
                          <div className="flex items-center gap-[10px]">
                            <input
                              id={`payment_method_${m}`}
                              type="radio"
                              name="payment_method"
                              value={m}
                              checked={on}
                              onChange={() => setMethod(m)}
                              className={single ? "hidden" : "size-[17px] shrink-0 cursor-pointer accent-primary"}
                            />
                            <label
                              htmlFor={`payment_method_${m}`}
                              className={`flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[15px] font-bold leading-[1.4] ${on ? "text-primary" : "text-body"}`}
                            >
                              {PAYMENT_METHODS[m].title}{" "}
                              {m === "razorpay" && (
                                // same Razorpay logo as the old site, from Razorpay's own CDN
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={RAZORPAY_LOGO_URL} alt="Pay by Razorpay" width={100} height={26} className="inline-block h-[24px] w-[92px] align-middle" />
                              )}
                            </label>
                          </div>
                          {on && (
                            <div className={single ? "mt-[8px]" : "mt-[8px] pl-[27px]"}>
                              {m === "razorpay" && !paymentsEnabled ? (
                                <p role="status" className="rounded-[10px] border border-[#f5c2c0] bg-[#fdecea] px-[12px] py-[10px] text-left text-[14px] leading-[1.5] text-[#8e1c1c]">
                                  {notConfiguredMessage}
                                </p>
                              ) : (
                                <p className="text-[14px] leading-[1.6] text-body">{PAYMENT_METHODS[m].description}</p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              </div>

              <label className="flex cursor-pointer items-start gap-[10px] text-[14px] leading-[1.55] text-body">
                <input type="checkbox" checked={form.reviewConsent} onChange={(e) => update((f) => ({ ...f, reviewConsent: e.target.checked }))} className="mt-[3px] size-[16px] shrink-0 accent-primary" />
                <span>Would you like to be invited to review your order? Check here to receive an email from Jivo Mart with a review form.</span>
              </label>

              {payError && (
                <Notice kind="error" className="mt-[16px] !text-[14px]">
                  {payError}
                </Notice>
              )}

              <button
                type="submit"
                disabled={!canPay || placing || !review.lines.length}
                aria-describedby={!canPay ? "payment-off" : undefined}
                className="btn btn-primary mt-[20px] h-[52px] w-full text-[15px] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {buttonText}
              </button>
              {!canPay && (
                <span id="payment-off" className="sr-only">
                  {notConfiguredMessage}
                </span>
              )}
            </div>
            <SafeCheckoutBox className="mt-[16px]" />
          </aside>
        </form>
      </div>
    </div>
  );
}
