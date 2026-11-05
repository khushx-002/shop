import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listCoupons, pageParam, textParam } from "@/lib/admin/queries";
import { formatDate } from "@/lib/admin/format";
import { formatPaise } from "@/lib/pricing";
import { EmptyRow, hrefWith, Notice, PageTitle, Pagination, Pill, SearchBox, Table } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Coupons" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminCoupons({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = textParam(sp.q);
  const page = pageParam(sp.page);
  const created = textParam(sp.created, 40);
  const deleted = textParam(sp.deleted, 40);
  const data = await listCoupons({ q, page });
  const base = "/admin/coupons/";

  return (
    <>
      <PageTitle title="Coupons">
        <Link href={`${base}new/`} className="btn btn-primary !px-4 !py-2">
          + Add coupon
        </Link>
      </PageTitle>
      {created && <Notice tone="ok">Coupon {created} created.</Notice>}
      {deleted && <Notice tone="ok">Coupon {deleted} deleted.</Notice>}
      <SearchBox action={base} q={q} placeholder="Search coupon code" />
      <Table head={["Code", "Type", "Amount", "Min / max spend", "Expires", "Used", "Status"]} caption="Coupons">
        {data.rows.length === 0 && <EmptyRow cols={7} text={q ? `No coupons match “${q}”.` : "No coupons yet."} />}
        {data.rows.map((c) => {
          const expired = c.expired;
          const usedUp = c.usageLimit != null && c.usedCount >= c.usageLimit;
          return (
            <tr key={c.id} className="hover:bg-[#fafaf8]">
              <td>
                <Link href={`${base}${c.id}/`} className="font-mono font-semibold text-primary hover:underline">
                  {c.code}
                </Link>
                {c.description && <span className="block text-[12px] text-muted">{c.description}</span>}
              </td>
              <td>{c.type === "fixed_cart" ? "Fixed cart" : c.type === "percent" ? "Percentage" : "Free shipping"}</td>
              <td className="whitespace-nowrap">{c.type === "fixed_cart" ? formatPaise(c.amount) : c.type === "percent" ? `${c.amount}%` : "–"}</td>
              <td className="whitespace-nowrap">
                {c.minSpendPaise != null ? formatPaise(c.minSpendPaise) : "–"} / {c.maxSpendPaise != null ? formatPaise(c.maxSpendPaise) : "–"}
              </td>
              <td className="whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
              <td>
                {c.usedCount}
                {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
              </td>
              <td>
                {!c.active ? <Pill tone="grey">Inactive</Pill> : expired ? <Pill tone="red">Expired</Pill> : usedUp ? <Pill tone="red">Used up</Pill> : <Pill tone="green">Active</Pill>}
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { q, page: p })} />
    </>
  );
}
