/**
 * /my-account/orders/ and /my-account/orders/<page>/ – the customer's orders (WooCommerce table).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { BTN_SMALL_DARK } from "@/components/account/form-styles";
import { formatOrderDate } from "@/lib/account/format";
import { listCustomerOrders } from "@/lib/account/orders";
import { requireAccountUser } from "@/lib/account/session";
import { formatPaise } from "@/lib/pricing";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Orders", path: routes.accountOrders, noindex: true });

const pageHref = (n: number) => (n <= 1 ? routes.accountOrders : `${routes.accountOrders}${n}/`);

/* Table cells turn into "label: value" rows on phones (WooCommerce responsive table). */
const TH = "border-b border-line bg-cream px-[16px] py-[13px] text-left text-[13px] font-bold uppercase tracking-[0.08em] text-primary";
const TD =
  "flex justify-between gap-[12px] px-[16px] py-[8px] text-[15px] text-body before:font-bold before:text-ink before:content-[attr(data-title)] min-[768px]:table-cell min-[768px]:border-b min-[768px]:border-line min-[768px]:py-[15px] min-[768px]:align-middle min-[768px]:before:content-none";

export default async function OrdersPage({ params }: { params: Promise<{ page?: string[] }> }) {
  const { page: parts } = await params;
  if (parts && (parts.length !== 1 || !/^[1-9]\d{0,4}$/.test(parts[0]))) notFound();
  const page = parts ? Number(parts[0]) : 1;
  const user = await requireAccountUser(pageHref(page));
  const { rows, totalPages } = await listCustomerOrders(user.id, page);
  if (page > 1 && page > totalPages) notFound();

  return (
    <AccountShell active="orders" isAdmin={user.role === "admin"}>
      {rows.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-[16px] rounded-[14px] border-l-[4px] border-gold bg-cream px-[20px] py-[16px] text-[15px] text-ink" role="status">
          <span>No order has been made yet.</span>
          <Link href={routes.shop} className={BTN_SMALL_DARK}>
            Browse products
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[16px] border border-line">
            <table className="w-full border-collapse [&>tbody>tr:last-child]:border-b-0 min-[768px]:[&>tbody>tr:last-child>td]:border-b-0">
              <caption className="sr-only">Your orders</caption>
              <thead className="hidden min-[768px]:table-header-group">
                <tr>
                  <th scope="col" className={TH}>Order</th>
                  <th scope="col" className={TH}>Date</th>
                  <th scope="col" className={TH}>Status</th>
                  <th scope="col" className={TH}>Total</th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.number} className="block border-b border-line py-[10px] transition-colors min-[768px]:table-row min-[768px]:py-0 min-[768px]:hover:bg-cream-light">
                    <td data-title="Order" className={TD}>
                      <Link href={routes.accountOrder(o.number)} className="font-bold text-primary underline decoration-gold underline-offset-4 hover:text-gold-dark" aria-label={`View order number ${o.number}`}>
                        #{o.number}
                      </Link>
                    </td>
                    <td data-title="Date" className={TD}>
                      <time dateTime={o.createdAt}>{formatOrderDate(o.createdAt)}</time>
                    </td>
                    <td data-title="Status" className={TD}>
                      {o.statusLabel}
                    </td>
                    <td data-title="Total" className={TD}>
                      <span>
                        <span className="font-semibold text-ink">{formatPaise(o.totalPaise)}</span> for {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td data-title="Actions" className={`${TD} min-[768px]:text-right`}>
                      <Link href={routes.accountOrder(o.number)} className={BTN_SMALL_DARK} aria-label={`View order ${o.number}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav aria-label="Orders pages" className="mt-[24px] flex justify-between gap-[12px]">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className={BTN_SMALL_DARK}>
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="self-center text-[14px] text-muted">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} className={BTN_SMALL_DARK}>
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </AccountShell>
  );
}
