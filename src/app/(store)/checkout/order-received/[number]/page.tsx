/**
 * /checkout/order-received/<number>/?key=<accessToken> – WooCommerce "thank you" page.
 * Shown only with the order's private key (guests) or to the logged-in owner; otherwise 404.
 * Dynamic and never indexed.
 * Heritage look: green thank-you line in a cream card, the order overview as a soft card, the
 * items table in a rounded box with a cream header row, addresses in soft cards.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { Notice } from "@/components/checkout/Notice";
import { PayAgainButton } from "@/components/checkout/PayAgainButton";
import { getSessionUser } from "@/lib/auth/session";
import { getOrderForCustomer } from "@/lib/checkout/orders";
import { paymentMethodTitle } from "@/lib/checkout/payment-methods";
import { ORDER_NUMBER_RE } from "@/lib/checkout/helpers";
import type { OrderAddress } from "@/lib/db/schema";
import { stateName } from "@/lib/india";
import { formatPaise } from "@/lib/pricing";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return pageMetadata({ title: "Order received", path: `/checkout/order-received/${encodeURIComponent(number)}/`, noindex: true });
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  refunded: "Refunded",
};

const LINK = "font-semibold text-primary underline decoration-gold underline-offset-4 hover:text-gold-dark";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}

function Address({ title, a, email }: { title: string; a: OrderAddress; email?: string }) {
  return (
    <section className="min-w-0 flex-1">
      <h2 className="mb-[12px] font-heading text-[22px] font-bold leading-[1.25] text-primary">{title}</h2>
      <address className="card-soft px-[20px] py-[18px] text-[15px] not-italic leading-[1.7] text-body">
        {a.fullName}
        <br />
        {a.company && (
          <>
            {a.company}
            <br />
          </>
        )}
        {a.address1}
        <br />
        {a.address2 && (
          <>
            {a.address2}
            <br />
          </>
        )}
        {a.city} {a.postcode}
        <br />
        {stateName(a.state)}, India
        {a.phone && (
          <>
            <br />
            {a.phone}
          </>
        )}
        {email && (
          <>
            <br />
            {email}
          </>
        )}
      </address>
    </section>
  );
}

export default async function OrderReceivedPage({ params, searchParams }: Props) {
  const { number } = await params;
  const sp = await searchParams;
  const key = typeof sp.key === "string" ? sp.key : null;
  if (!ORDER_NUMBER_RE.test(number)) notFound();
  const user = await getSessionUser();
  const order = await getOrderForCustomer(number, key, user);
  if (!order) notFound();

  const pending = order.status === "pending_payment";
  const failed = order.status === "cancelled" || order.status === "failed";
  const overview: [string, string][] = [
    ["Order number", order.number],
    ["Date", formatDate(order.createdAt)],
    ["Email", order.email],
    ["Total", formatPaise(order.totalPaise)],
    ["Payment method", paymentMethodTitle(order.paymentProvider)],
  ];
  const sameAddress = JSON.stringify({ ...order.billing, phone: undefined, email: undefined }) === JSON.stringify({ ...order.shipping, phone: undefined, email: undefined });

  return (
    <>
      <CheckoutHeader active={3} />
      <div className="bg-cream-light">
        <div className="site-container pb-[64px] pt-[32px] text-body min-[993px]:pb-[88px] min-[993px]:pt-[44px]">
          <h1 className="sr-only">Order received</h1>
          {pending ? (
            <Notice kind="info">
              <p>
                <strong>We are waiting for your payment to be confirmed.</strong> If you have already paid, the confirmation usually arrives within a few minutes – please refresh this page. If the payment did not go through, you can pay
                now.
              </p>
              {isRazorpayConfigured() ? (
                <PayAgainButton orderNumber={order.number} accessKey={order.accessToken} />
              ) : (
                <p className="mt-[8px]">
                  Online payment is not configured yet. Please contact <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
                </p>
              )}
            </Notice>
          ) : failed ? (
            <Notice kind="error">
              This order is {STATUS_LABEL[order.status].toLowerCase()}. If you think this is a mistake, please contact us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or {SITE.phone}.
            </Notice>
          ) : (
            <p className="flex items-center gap-[14px] rounded-[20px] border border-line bg-cream px-[20px] py-[18px] font-heading text-[22px] font-bold leading-[1.3] text-primary md:px-[28px] md:py-[22px] md:text-[26px]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[40px] shrink-0 rounded-full bg-primary p-[8px] text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12.5 2.8 2.8L16.5 9.5" />
              </svg>
              Thank you. Your order has been received.
            </p>
          )}

          <ul className="card-soft mt-[24px] grid gap-y-[16px] px-[20px] py-[20px] shadow-soft min-[600px]:grid-cols-2 min-[993px]:flex min-[993px]:flex-wrap min-[993px]:px-0">
            {overview.map(([label, value]) => (
              <li key={label} className="min-w-0 text-[12px] font-bold uppercase tracking-[0.12em] text-gold-dark min-[993px]:flex-1 min-[993px]:border-r min-[993px]:border-line min-[993px]:px-[22px] min-[993px]:last:border-r-0">
                {label}:
                <strong className="mt-[6px] block break-words text-[15px] font-bold normal-case tracking-normal text-ink">{value}</strong>
              </li>
            ))}
          </ul>
          {!pending && !failed && (
            <p className="mt-[18px] text-[15px] leading-[1.65]">
              Order status: <strong className="text-ink">{STATUS_LABEL[order.status] ?? order.status}</strong>. We have emailed the order details to {order.email}. Please note: orders are not shipped or delivered on weekends or
              public holidays.
            </p>
          )}

          <section className="mt-[40px]" aria-labelledby="order-details-title">
            <h2 id="order-details-title" className="mb-[16px] font-heading text-[24px] font-bold leading-[1.2] text-primary md:text-[28px]">
              Order details
            </h2>
            <div className="overflow-hidden rounded-[16px] border border-line bg-white">
              <table className="w-full border-collapse text-[15px] [&>tfoot>tr:last-child]:border-b-0">
                <thead>
                  <tr className="bg-cream text-left text-[13px] uppercase tracking-[0.08em] text-primary">
                    <th scope="col" className="border-b border-line px-[16px] py-[13px] font-bold">
                      Product
                    </th>
                    <th scope="col" className="border-b border-line px-[16px] py-[13px] text-right font-bold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-b border-line">
                      <td className="px-[16px] py-[12px]">
                        <div className="flex items-center gap-[14px]">
                          {it.image && (
                            <span className="relative hidden size-[56px] shrink-0 overflow-hidden rounded-[12px] border border-line bg-cream-light min-[480px]:block">
                              <Image src={it.image} alt="" fill sizes="56px" className="object-contain p-[4px]" />
                            </span>
                          )}
                          <span>
                            {it.productSlug ? (
                              <Link href={routes.product(it.productSlug)} className="font-semibold text-primary transition-colors hover:text-gold-dark">
                                {it.productName}
                              </Link>
                            ) : (
                              <span className="text-ink">{it.productName}</span>
                            )}
                            {it.variationLabel && <span className="text-muted"> – {it.variationLabel}</span>} <strong className="text-ink">× {it.qty}</strong>
                          </span>
                        </div>
                      </td>
                      <td className="px-[16px] py-[12px] text-right">{formatPaise(it.lineTotalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-b border-line">
                    <th scope="row" className="px-[16px] py-[12px] text-left font-normal text-ink">
                      Subtotal:
                    </th>
                    <td className="px-[16px] py-[12px] text-right">{formatPaise(order.subtotalPaise)}</td>
                  </tr>
                  {order.discountPaise > 0 && (
                    <tr className="border-b border-line">
                      <th scope="row" className="px-[16px] py-[12px] text-left font-normal text-ink">
                        Discount{order.couponCode ? ` (${order.couponCode})` : ""}:
                      </th>
                      <td className="px-[16px] py-[12px] text-right">-{formatPaise(order.discountPaise)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-line">
                    <th scope="row" className="px-[16px] py-[12px] text-left font-normal text-ink">
                      Shipping:
                    </th>
                    <td className="px-[16px] py-[12px] text-right">
                      {order.shippingPaise > 0 ? `${formatPaise(order.shippingPaise)} via ${order.shippingMethod ?? "Flat rate"}` : (order.shippingMethod ?? "Free shipping")}
                    </td>
                  </tr>
                  <tr className="border-b border-line">
                    <th scope="row" className="px-[16px] py-[12px] text-left font-normal text-ink">
                      Payment method:
                    </th>
                    <td className="px-[16px] py-[12px] text-right">{paymentMethodTitle(order.paymentProvider)}</td>
                  </tr>
                  <tr className="border-b border-line bg-cream-light text-primary">
                    <th scope="row" className="px-[16px] py-[14px] text-left font-heading text-[20px] font-bold">
                      Total:
                    </th>
                    <td className="px-[16px] py-[14px] text-right text-[18px] font-bold">{formatPaise(order.totalPaise)}</td>
                  </tr>
                  {order.customerNote && (
                    <tr>
                      <th scope="row" className="px-[16px] py-[12px] text-left align-top font-normal text-ink">
                        Note:
                      </th>
                      <td className="whitespace-pre-line px-[16px] py-[12px] text-right">{order.customerNote}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </section>

          <div className="mt-[36px] flex flex-col gap-[24px] min-[769px]:flex-row">
            <Address title="Billing address" a={order.billing} email={order.email} />
            <Address title="Shipping address" a={sameAddress ? { ...order.billing, phone: undefined } : order.shipping} />
          </div>

          <p className="mt-[30px] rounded-[14px] border-l-[3px] border-gold bg-cream px-[18px] py-[14px] text-[14px] leading-[1.65]">
            Questions about your order? Email <a href={`mailto:${SITE.email}`} className={LINK}>{SITE.email}</a> or call <a href={SITE.phoneHref} className={LINK}>{SITE.phone}</a>. You can also{" "}
            <Link href={routes.trackOrder} className={LINK}>
              track your order
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
