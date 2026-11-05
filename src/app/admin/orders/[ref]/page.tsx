/**
 * Admin order page. The URL accepts the order number (/admin/orders/JM12345678/) or the
 * database id (/admin/orders/42/ – used by the "new order" email to the admin).
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminOrder, type AdminOrder } from "@/lib/admin/queries";
import { formatDateTime, ORDER_STATUS_LABELS } from "@/lib/admin/format";
import { safeHttpUrl } from "@/lib/account/format";
import { formatPaise } from "@/lib/pricing";
import { stateName } from "@/lib/india";
import { routes } from "@/lib/routes";
import { Card, PageTitle, Pill, StatusBadge } from "@/components/admin/ui";
import { NoteForm, StatusForm, TrackingForm } from "@/components/admin/OrderForms";

type Params = Promise<{ ref: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ref } = await params;
  return { title: `Order ${decodeURIComponent(ref).slice(0, 30)}` };
}

const EVENT_LABELS: Record<string, string> = {
  created: "Order created",
  paid: "Payment received",
  payment_started: "Payment started",
  payment_error: "Payment error",
  payment_failed: "Payment failed",
  payment_mismatch: "Payment mismatch",
  checkout_retry: "Checkout retried",
  status: "Status change",
  tracking: "Tracking",
  note: "Private note",
  customer_note: "Note to customer",
  email: "Email",
  stock_reduced: "Stock reduced",
  stock_restored: "Stock returned",
  account_created: "Account created",
  review_consent: "Review consent",
  error: "Error",
};

function Address({ a, email }: { a: AdminOrder["billing"]; email?: string }) {
  return (
    <address className="text-[14px] not-italic leading-6 text-ink">
      <strong>{a.fullName}</strong>
      {a.company && <span className="block">{a.company}</span>}
      <span className="block">{a.address1}</span>
      {a.address2 && <span className="block">{a.address2}</span>}
      <span className="block">
        {a.city} {a.postcode}
      </span>
      <span className="block">{stateName(a.state)}</span>
      {a.phone && (
        <a href={`tel:${a.phone}`} className="block text-primary hover:underline">
          {a.phone}
        </a>
      )}
      {(email || a.email) && (
        <a href={`mailto:${email || a.email}`} className="block break-all text-primary hover:underline">
          {email || a.email}
        </a>
      )}
    </address>
  );
}

export default async function AdminOrderPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { ref } = await params;
  const order = await getAdminOrder(decodeURIComponent(ref));
  if (!order) notFound();
  const trackingUrl = safeHttpUrl(order.trackingUrl);
  const canShip = ["paid", "processing", "shipped", "completed"].includes(order.status);

  return (
    <>
      <PageTitle title={`Order #${order.number}`} back={{ href: "/admin/orders/", label: "All orders" }}>
        <StatusBadge status={order.status} />
      </PageTitle>
      <p className="-mt-4 mb-6 text-[14px] text-muted">
        Placed {formatDateTime(order.createdAt)}
        {order.user ? (
          <>
            {" "}
            by customer{" "}
            <Link href={`/admin/customers/${order.user.id}/`} className="text-primary hover:underline">
              {order.user.name || order.user.email}
            </Link>
          </>
        ) : (
          " as a guest"
        )}
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card title="Items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <caption className="sr-only">Items in this order</caption>
                <thead className="border-b border-line text-[13px] uppercase tracking-wide text-[#555]">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      SKU
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Qty
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id} className="border-b border-line">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          {i.image?.startsWith("/") ? (
                            <Image src={i.image} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded border border-line object-contain" />
                          ) : (
                            <span className="h-12 w-12 shrink-0 rounded border border-line bg-surface" aria-hidden="true" />
                          )}
                          <span>
                            {i.productSlug ? (
                              <a href={routes.product(i.productSlug)} target="_blank" rel="noopener" className="font-semibold text-ink hover:text-primary hover:underline">
                                {i.productName}
                              </a>
                            ) : (
                              <strong>{i.productName}</strong>
                            )}
                            {i.variationLabel && <span className="block text-[13px] text-muted">{i.variationLabel}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[13px]">{i.sku || "–"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">{formatPaise(i.unitPricePaise)}</td>
                      <td className="px-3 py-3 text-right">× {i.qty}</td>
                      <td className="whitespace-nowrap py-3 pl-3 text-right font-semibold">{formatPaise(i.lineTotalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-4 grid max-w-[340px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-[14px]">
              <dt>Subtotal</dt>
              <dd className="text-right">{formatPaise(order.subtotalPaise)}</dd>
              {order.discountPaise > 0 && (
                <>
                  <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd className="text-right">−{formatPaise(order.discountPaise)}</dd>
                </>
              )}
              <dt>Shipping{order.shippingMethod ? ` (${order.shippingMethod})` : ""}</dt>
              <dd className="text-right">{order.shippingPaise ? formatPaise(order.shippingPaise) : "Free"}</dd>
              <dt className="border-t border-line pt-2 font-bold text-ink">Total</dt>
              <dd className="border-t border-line pt-2 text-right font-bold text-ink">{formatPaise(order.totalPaise)}</dd>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Billing address">
              <Address a={order.billing} email={order.email} />
            </Card>
            <Card title="Shipping address">
              <Address a={order.shipping} />
            </Card>
          </div>

          {order.customerNote && (
            <Card title="Customer note">
              <p className="whitespace-pre-line text-[14px] text-ink">{order.customerNote}</p>
            </Card>
          )}

          <Card title="Payment">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
              <dt className="text-muted">Method</dt>
              <dd>{order.paymentProvider === "razorpay" ? "Razorpay (card / UPI / netbanking)" : order.paymentProvider === "cod" ? "Cash on delivery (collect when delivered)" : order.paymentProvider}</dd>
              <dt className="text-muted">Razorpay order</dt>
              <dd className="break-all font-mono text-[13px]">{order.razorpayOrderId || "–"}</dd>
              <dt className="text-muted">Razorpay payment</dt>
              <dd className="break-all font-mono text-[13px]">{order.razorpayPaymentId || "–"}</dd>
              <dt className="text-muted">Paid at</dt>
              <dd>{order.paidAt ? formatDateTime(order.paidAt) : <Pill tone="yellow">Not paid</Pill>}</dd>
              <dt className="text-muted">Stock reduced</dt>
              <dd>{order.stockReduced ? "Yes" : "No"}</dd>
              <dt className="text-muted">Customer IP</dt>
              <dd>{order.ipAddress || "–"}</dd>
            </dl>
            <p className="mt-3 text-[13px] text-muted">Refunds are made in the Razorpay dashboard. Changing the status here never moves money.</p>
          </Card>

          <Card title="Order history">
            {order.events.length === 0 ? (
              <p className="text-[14px] text-muted">No events yet.</p>
            ) : (
              <ol className="space-y-3">
                {order.events.map((e) => {
                  const visible = e.type === "customer_note" || e.type === "status";
                  return (
                    <li key={e.id} className={`rounded border-l-4 px-3 py-2 text-[14px] ${e.type === "customer_note" ? "border-[#2e3a84] bg-[#eef1fb]" : e.type === "note" ? "border-accent bg-[#fffaea]" : /error|failed|mismatch/.test(e.type) ? "border-danger bg-[#fdecec]" : "border-line bg-surface"}`}>
                      <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        <strong className="text-ink">{EVENT_LABELS[e.type] ?? e.type}</strong>
                        <span>{formatDateTime(e.createdAt)}</span>
                        {e.actor && <span>· {e.actor}</span>}
                        {visible && <Pill tone="blue">Customer can see this</Pill>}
                      </div>
                      {e.message && <p className="whitespace-pre-line break-words text-ink">{e.message}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <StatusForm orderId={order.id} status={order.status} paid={!!order.paidAt} stockReduced={order.stockReduced} />
          </Card>
          <Card title="Shipping & tracking">
            {(order.courier || order.trackingNumber) && (
              <p className="mb-3 text-[14px] text-ink">
                Current: {order.courier} {order.trackingNumber}
                {trackingUrl && (
                  <>
                    {" – "}
                    <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      open link
                    </a>
                  </>
                )}
              </p>
            )}
            {canShip ? (
              <TrackingForm orderId={order.id} courier={order.courier} trackingNumber={order.trackingNumber} trackingUrl={order.trackingUrl} />
            ) : (
              <p className="text-[14px] text-muted">Tracking can be added once the order is paid (status now: {ORDER_STATUS_LABELS[order.status]}).</p>
            )}
          </Card>
          <Card title="Add a note">
            <NoteForm orderId={order.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
