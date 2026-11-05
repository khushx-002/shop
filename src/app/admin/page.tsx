import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDashboard, LOW_STOCK_LIMIT } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/admin/format";
import { formatPaise } from "@/lib/pricing";
import { Card, EmptyRow, Notice, PageTitle, Pill, StatCard, StatusBadge, Table } from "@/components/admin/ui";

export const metadata: Metadata = { title: { absolute: "Dashboard – Jivo Mart admin" } };

export default async function AdminDashboard() {
  await requireAdminPage();
  const d = await getDashboard();

  return (
    <>
      <PageTitle title="Dashboard" />

      {(d.warnings.length > 0 || d.zoneNotes.length > 0) && (
        <section aria-labelledby="setup-title" className="mb-6 rounded-md border border-[#f0d58c] bg-[#fdf6e3] p-4 md:p-5">
          <h2 id="setup-title" className="mb-3 text-[17px] font-bold text-[#6b4f00]">
            Setup warnings
          </h2>
          <ul className="space-y-3 text-[14px] text-[#5a4300]">
            {d.warnings.map((w) => (
              <li key={w.title}>
                <strong className="block text-[#4a3700]">{w.title}</strong>
                {w.text}
              </li>
            ))}
            {d.zoneNotes.map((z) => (
              <li key={z.id}>
                <strong className="block text-[#4a3700]">
                  Shipping zone “{z.name}”{!z.enabled && " (disabled)"} – please confirm
                </strong>
                {z.note}{" "}
                <Link href={`/admin/shipping/${z.id}/`} className="font-semibold underline">
                  Edit zone
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Paid orders today" value={d.paidToday} hint={d.pendingToday ? `${d.pendingToday} more waiting for payment` : undefined} href="/admin/orders/" />
        <StatCard label="Paid revenue, 30 days" value={formatPaise(d.revenue30)} />
        <StatCard label="Waiting to ship" value={d.processing} hint="Orders in Processing" href="/admin/orders/?status=processing" tone={d.processing ? "warn" : "default"} />
        <StatCard label="Pending reviews" value={d.pendingReviews} href="/admin/reviews/" tone={d.pendingReviews ? "warn" : "default"} />
        <StatCard label="Unread messages" value={d.unreadMessages} href="/admin/messages/" tone={d.unreadMessages ? "warn" : "default"} />
        <StatCard label="Waiting-list requests" value={d.waiting} hint="Not emailed yet" href="/admin/waitlist/" />
        <StatCard label="Low / out-of-stock packs" value={d.stock.length} href="#stock" tone={d.stock.length ? "warn" : "default"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title="Recent orders" actions={<Link href="/admin/orders/" className="text-[14px] font-semibold text-primary hover:underline">All orders →</Link>}>
          <Table head={["Order", "Date", "Customer", "Status", "Total"]} caption="Recent orders">
            {d.recent.length === 0 && <EmptyRow cols={5} text="No orders yet." />}
            {d.recent.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.number}/`} className="font-semibold text-primary hover:underline">
                    #{o.number}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                <td>{o.billing.fullName}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="whitespace-nowrap">{formatPaise(o.totalPaise)}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <div id="stock" className="scroll-mt-20">
          <Card title="Low and out-of-stock packs">
            {d.stock.length === 0 ? (
              <Notice tone="ok">All packs are in stock.</Notice>
            ) : (
              <>
                <p className="mb-3 text-[13px] text-muted">Out of stock, or stock managed and {LOW_STOCK_LIMIT} or fewer left.</p>
                <ul className="divide-y divide-line text-[14px]">
                  {d.stock.map((s) => {
                    const out = !s.inStock || (s.manageStock && (s.stockQty ?? 0) <= 0);
                    return (
                      <li key={s.variationId} className="flex items-center justify-between gap-3 py-2">
                        <Link href={`/admin/products/${s.productId}/`} className="min-w-0 text-ink hover:text-primary hover:underline">
                          {s.productName} – {s.label}
                        </Link>
                        {out ? <Pill tone="red">Out of stock</Pill> : <Pill tone="yellow">{s.stockQty} left</Pill>}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
