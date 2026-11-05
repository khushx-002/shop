import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listOrders, pageParam, textParam } from "@/lib/admin/queries";
import { formatDateTime, ORDER_TABS, type OrderStatus } from "@/lib/admin/format";
import { formatPaise } from "@/lib/pricing";
import { EmptyRow, hrefWith, PageTitle, Pagination, SearchBox, StatusBadge, Table, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrders({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const statusRaw = textParam(sp.status, 30);
  const status = (ORDER_TABS.some((t) => t.key === statusRaw) ? statusRaw : "all") as OrderStatus | "all";
  const q = textParam(sp.q);
  const page = pageParam(sp.page);
  const data = await listOrders({ status, q, page });
  const base = "/admin/orders/";

  return (
    <>
      <PageTitle title="Orders" />
      <Tabs
        label="Order status"
        active={status}
        tabs={ORDER_TABS.map((t) => ({ key: t.key, label: t.label, count: data.counts[t.key] ?? 0, href: hrefWith(base, { status: t.key === "all" ? undefined : t.key, q }) }))}
      />
      <SearchBox action={base} q={q} placeholder="Search order number, email, phone or name" hidden={{ status: status === "all" ? "" : status }} />
      <Table head={["Order", "Date", "Customer", "Status", "Total"]} caption="Orders">
        {data.rows.length === 0 && <EmptyRow cols={5} text={q ? `No orders match “${q}”.` : "No orders here yet."} />}
        {data.rows.map((o) => (
          <tr key={o.id} className="hover:bg-[#fafaf8]">
            <td>
              <Link href={`${base}${o.number}/`} className="font-semibold text-primary hover:underline">
                #{o.number}
              </Link>
              <span className="block text-[12px] text-muted">
                {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
              </span>
            </td>
            <td className="whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
            <td>
              {o.billing.fullName}
              <span className="block text-[12px] text-muted">{o.email}</span>
            </td>
            <td>
              <StatusBadge status={o.status} />
            </td>
            <td className="whitespace-nowrap font-semibold">{formatPaise(o.totalPaise)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { status: status === "all" ? undefined : status, q, page: p })} />
    </>
  );
}
