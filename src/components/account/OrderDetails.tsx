/**
 * WooCommerce "Order details" block: tracking info, order updates, items + totals and the
 * billing / shipping addresses. Heritage look: Playfair headings, the table in a rounded box with a
 * cream header row, addresses in soft cards. No hooks and no server imports, so both the my-account order
 * page (server) and the track-order form (browser) can render it.
 */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { OrderAddress } from "@/lib/db/schema";
import { formatOrderDateTime, type OrderView } from "@/lib/account/format";
import { stateName } from "@/lib/india";
import { formatPaise } from "@/lib/pricing";

const H2 = "mb-[14px] font-heading text-[22px] font-bold leading-[1.25] text-primary md:text-[24px]";
const CELL = "border-b border-line px-[16px] py-[13px] align-top";

function AddressLines({ a, withContact }: { a: OrderAddress; withContact: boolean }) {
  const cityLine = [a.city, [stateName(a.state), a.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const lines = [a.fullName, a.company, a.address1, a.address2, cityLine, "India"].filter(Boolean);
  return (
    <address className="card-soft p-[20px] text-[15px] not-italic leading-[1.7] text-body">
      {lines.map((l, i) => (
        <span key={i} className="block">
          {l}
        </span>
      ))}
      {withContact && a.phone && (
        <span className="mt-[8px] flex items-center gap-[8px]">
          <Icon name="phone" size={15} label="Phone" className="shrink-0 text-gold-dark" />
          {a.phone}
        </span>
      )}
      {withContact && a.email && (
        <span className="flex items-center gap-[8px] break-all">
          <Icon name="mail" size={15} label="Email" className="shrink-0 text-gold-dark" />
          {a.email}
        </span>
      )}
    </address>
  );
}

export function OrderDetails({ order, headingLevel = 2 }: { order: OrderView; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="space-y-[36px]">
      {order.tracking && (
        <section aria-label="Tracking information" className="rounded-[16px] border border-line bg-cream p-[20px] md:p-[24px]">
          <H className={H2}>Tracking information</H>
          <dl className="grid grid-cols-[auto_1fr] gap-x-[16px] gap-y-[6px] text-[15px]">
            {order.tracking.courier && (
              <>
                <dt className="font-bold text-ink">Courier</dt>
                <dd>{order.tracking.courier}</dd>
              </>
            )}
            {order.tracking.number && (
              <>
                <dt className="font-bold text-ink">Tracking number</dt>
                <dd className="break-all">{order.tracking.number}</dd>
              </>
            )}
          </dl>
          {order.tracking.url && (
            <a href={order.tracking.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-[16px]">
              Track your shipment<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </section>
      )}

      {order.updates.length > 0 && (
        <section>
          <H className={H2}>Order updates</H>
          <ol className="space-y-[14px]">
            {order.updates.map((u, i) => (
              <li key={i} className="border-l-[3px] border-gold pl-[14px]">
                <p className="text-[13px] text-muted">
                  <time dateTime={u.date}>{formatOrderDateTime(u.date)}</time>
                </p>
                <p className="whitespace-pre-line text-[15px] text-ink">{u.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <H className={H2}>Order details</H>
        <div className="overflow-hidden rounded-[16px] border border-line">
          <table className="w-full border-collapse text-[15px] [&>tfoot>tr:last-child>*]:border-b-0">
            <thead>
              <tr className="bg-cream">
                <th scope="col" className={`${CELL} text-left text-[13px] font-bold uppercase tracking-[0.08em] text-primary`}>
                  Product
                </th>
                <th scope="col" className={`${CELL} text-right text-[13px] font-bold uppercase tracking-[0.08em] text-primary`}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i}>
                  <td className={CELL}>
                    {it.href ? (
                      <Link href={it.href} className="font-semibold text-primary hover:text-gold-dark hover:underline">
                        {it.name}
                      </Link>
                    ) : (
                      <span className="text-ink">{it.name}</span>
                    )}
                    {it.variationLabel && <span> – {it.variationLabel}</span>} <strong className="whitespace-nowrap font-bold">× {it.qty}</strong>
                  </td>
                  <td className={`${CELL} whitespace-nowrap text-right text-ink`}>{formatPaise(it.lineTotalPaise)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className={`${CELL} text-left font-normal`}>
                  Subtotal:
                </th>
                <td className={`${CELL} text-right text-ink`}>{formatPaise(order.subtotalPaise)}</td>
              </tr>
              {order.discountPaise > 0 && (
                <tr>
                  <th scope="row" className={`${CELL} text-left font-normal`}>
                    Discount{order.couponCode ? ` (${order.couponCode})` : ""}:
                  </th>
                  <td className={`${CELL} text-right text-ink`}>-{formatPaise(order.discountPaise)}</td>
                </tr>
              )}
              <tr>
                <th scope="row" className={`${CELL} text-left font-normal`}>
                  Shipping:
                </th>
                <td className={`${CELL} text-right text-ink`}>
                  {order.shippingPaise > 0 ? formatPaise(order.shippingPaise) : "Free shipping"}
                  {order.shippingMethod && order.shippingPaise > 0 && <span className="block text-[13px] text-muted">via {order.shippingMethod}</span>}
                </td>
              </tr>
              {order.paymentMethod && (
                <tr>
                  <th scope="row" className={`${CELL} text-left font-normal`}>
                    Payment method:
                  </th>
                  <td className={`${CELL} text-right text-ink`}>{order.paymentMethod}</td>
                </tr>
              )}
              <tr>
                <th scope="row" className={`${CELL} bg-cream-light text-left font-heading text-[18px] font-bold text-primary`}>
                  Total:
                </th>
                <td className={`${CELL} bg-cream-light text-right text-[17px] font-bold text-primary`}>{formatPaise(order.totalPaise)}</td>
              </tr>
              {order.customerNote && (
                <tr>
                  <th scope="row" className={`${CELL} text-left font-normal`}>
                    Note:
                  </th>
                  <td className={`${CELL} whitespace-pre-line text-right`}>{order.customerNote}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </section>

      <section className="grid gap-[30px] min-[768px]:grid-cols-2">
        <div>
          <H className={H2}>Billing address</H>
          <AddressLines a={order.billing} withContact />
        </div>
        <div>
          <H className={H2}>Shipping address</H>
          <AddressLines a={order.shipping} withContact={false} />
        </div>
      </section>
    </div>
  );
}
