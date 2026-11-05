import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getCustomer } from "@/lib/admin/queries";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { setUserRoleAction } from "@/lib/admin/actions/moderation";
import { formatPaise } from "@/lib/pricing";
import { stateName } from "@/lib/india";
import { ActionForm, ConfirmButton } from "@/components/admin/ActionForm";
import { Card, EmptyRow, PageTitle, Pill, StatusBadge, Table } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const data = await getCustomer(Number(id));
  if (!data) notFound();
  const { user: u, orders } = data;
  const self = u.id === admin.id;

  return (
    <>
      <PageTitle title={u.name || u.email} back={{ href: "/admin/customers/", label: "All customers" }}>
        {u.role === "admin" ? <Pill tone="blue">Admin</Pill> : <Pill tone="grey">Customer</Pill>}
      </PageTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card title={`Orders (${orders.length}${orders.length === 50 ? "+" : ""})`}>
            <Table head={["Order", "Date", "Status", "Total"]} caption="Orders of this customer">
              {orders.length === 0 && <EmptyRow cols={4} text="No orders yet." />}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.number}/`} className="font-semibold text-primary hover:underline">
                      #{o.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="whitespace-nowrap">{formatPaise(o.totalPaise)}</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Saved addresses">
            {u.addresses.length === 0 ? (
              <p className="text-[14px] text-muted">No saved addresses.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {u.addresses.map((a) => (
                  <address key={a.id} className="rounded border border-line p-3 text-[14px] not-italic leading-6 text-ink">
                    <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-muted">
                      {a.type} address{a.isDefault ? " (default)" : ""}
                    </span>
                    <strong>{a.fullName}</strong>
                    {a.company && <span className="block">{a.company}</span>}
                    <span className="block">{a.address1}</span>
                    {a.address2 && <span className="block">{a.address2}</span>}
                    <span className="block">
                      {a.city} {a.postcode}
                    </span>
                    <span className="block">{stateName(a.state)}</span>
                    {a.phone && <span className="block">{a.phone}</span>}
                    {a.email && <span className="block break-all">{a.email}</span>}
                  </address>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Account">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
              <dt className="text-muted">Email</dt>
              <dd className="break-all">
                <a href={`mailto:${u.email}`} className="text-primary hover:underline">
                  {u.email}
                </a>
              </dd>
              <dt className="text-muted">Phone</dt>
              <dd>{u.phone || "–"}</dd>
              <dt className="text-muted">Joined</dt>
              <dd>{formatDate(u.createdAt)}</dd>
              <dt className="text-muted">Marketing</dt>
              <dd>{u.marketingOptIn ? "Opted in" : "No"}</dd>
              <dt className="text-muted">Paid orders</dt>
              <dd>{data.orderCount}</dd>
              <dt className="text-muted">Total spent</dt>
              <dd className="font-semibold">{formatPaise(data.spentPaise)}</dd>
            </dl>
          </Card>

          <Card title="Role">
            {self ? (
              <p className="text-[14px] text-muted">This is your own account. Another admin must change your role.</p>
            ) : (
              <ActionForm action={setUserRoleAction}>
                <input type="hidden" name="id" value={u.id} />
                {u.role === "admin" ? (
                  <>
                    <p className="mb-3 text-[14px]">This user can open the admin area and change orders, products and settings.</p>
                    <input type="hidden" name="role" value="customer" />
                    <ConfirmButton question="Remove admin rights?" confirmText="Yes, make customer">
                      Make normal customer
                    </ConfirmButton>
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-[14px]">Admins can see all orders and customer data and change the shop. Only give this to staff.</p>
                    <input type="hidden" name="role" value="admin" />
                    <ConfirmButton
                      question="Give full admin rights?"
                      confirmText="Yes, make admin"
                      className="rounded border border-primary px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary hover:text-white"
                    >
                      Make admin
                    </ConfirmButton>
                  </>
                )}
              </ActionForm>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
