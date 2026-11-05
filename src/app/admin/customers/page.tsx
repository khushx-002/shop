import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listCustomers, pageParam, textParam } from "@/lib/admin/queries";
import { formatDate } from "@/lib/admin/format";
import { formatPaise } from "@/lib/pricing";
import { EmptyRow, hrefWith, PageTitle, Pagination, Pill, SearchBox, Table, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminCustomers({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = textParam(sp.q);
  const rawRole = textParam(sp.role, 10);
  const role = rawRole === "admin" || rawRole === "customer" ? rawRole : "all";
  const page = pageParam(sp.page);
  const data = await listCustomers({ q, role, page });
  const base = "/admin/customers/";
  const roleParam = role === "all" ? undefined : role;

  return (
    <>
      <PageTitle title="Customers" />
      <Tabs
        label="Role"
        active={role}
        tabs={[
          { key: "all", label: "All", href: hrefWith(base, { q }) },
          { key: "customer", label: "Customers", href: hrefWith(base, { role: "customer", q }) },
          { key: "admin", label: "Admins", href: hrefWith(base, { role: "admin", q }) },
        ]}
      />
      <SearchBox action={base} q={q} placeholder="Search email, name or phone" hidden={{ role: roleParam ?? "" }} />
      <Table head={["Name", "Email", "Joined", "Paid orders", "Total spent", "Role"]} caption="Customers">
        {data.rows.length === 0 && <EmptyRow cols={6} text={q ? `No users match “${q}”.` : "No users yet."} />}
        {data.rows.map((u) => (
          <tr key={u.id} className="hover:bg-[#fafaf8]">
            <td>
              <Link href={`${base}${u.id}/`} className="font-semibold text-primary hover:underline">
                {u.name || "(no name)"}
              </Link>
              {u.phone && <span className="block text-[12px] text-muted">{u.phone}</span>}
            </td>
            <td className="break-all">{u.email}</td>
            <td className="whitespace-nowrap">{formatDate(u.createdAt)}</td>
            <td>{u.orderCount}</td>
            <td className="whitespace-nowrap">{formatPaise(u.spentPaise)}</td>
            <td>{u.role === "admin" ? <Pill tone="blue">Admin</Pill> : <Pill tone="grey">Customer</Pill>}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { role: roleParam, q, page: p })} />
    </>
  );
}
