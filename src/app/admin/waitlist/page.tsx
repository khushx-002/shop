import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listWaitlist, pageParam, textParam } from "@/lib/admin/queries";
import { formatDate } from "@/lib/admin/format";
import { notifyWaitlistAction } from "@/lib/admin/actions/products";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { hrefWith, PageTitle, Pagination, Pill, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Waiting list" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminWaitlist({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const show = textParam(sp.show, 10) === "all" ? "all" : "waiting";
  const page = pageParam(sp.page);
  const data = await listWaitlist({ page, show });
  const base = "/admin/waitlist/";

  return (
    <>
      <PageTitle title="Waiting list" />
      <p className="-mt-3 mb-4 text-[14px] text-muted">
        Customers who asked to be emailed when an out-of-stock product is back. Put the pack back in stock on the product page first, then send the email.
      </p>
      <Tabs
        label="Show"
        active={show}
        tabs={[
          { key: "waiting", label: "Still waiting", href: base },
          { key: "all", label: "All (incl. notified)", href: hrefWith(base, { show: "all" }) },
        ]}
      />
      {data.rows.length === 0 && <p className="rounded-md border border-line bg-white p-8 text-center text-muted">Nobody is on the waiting list.</p>}
      <ul className="space-y-4">
        {data.rows.map((g) => (
          <li key={g.key} className="rounded-md border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/admin/products/${g.productId}/`} className="text-[16px] font-bold text-primary hover:underline">
                  {g.productName}
                </Link>
                <span className="ml-2 text-[14px] text-ink">– {g.variationLabel ?? "any pack"}</span>
                <span className="ml-2">{g.inStock ? <Pill tone="green">In stock</Pill> : <Pill tone="red">Out of stock</Pill>}</span>
                <span className="block text-[13px] text-muted">
                  {g.pending} waiting · {g.entries.length - g.pending} already emailed
                </span>
              </div>
              {g.pending > 0 &&
                (g.inStock ? (
                  <ActionForm action={notifyWaitlistAction} compact className="flex max-w-[360px] flex-wrap justify-end">
                    <input type="hidden" name="productId" value={g.productId} />
                    <input type="hidden" name="variationId" value={g.variationId ?? ""} />
                    <SubmitButton className="btn btn-primary !px-4 !py-2" pendingText="Sending…">
                      Send back-in-stock email ({g.pending})
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <span className="text-[13px] text-muted">Available once the product is in stock</span>
                ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-[14px]">
                <caption className="sr-only">People waiting for {g.productName}</caption>
                <thead className="border-b border-line text-[12px] uppercase tracking-wide text-[#555]">
                  <tr>
                    <th scope="col" className="py-1.5 pr-3 font-semibold">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-1.5 font-semibold">
                      Joined
                    </th>
                    <th scope="col" className="py-1.5 pl-3 font-semibold">
                      Notified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.entries.map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className="break-all py-1.5 pr-3">{e.email}</td>
                      <td className="whitespace-nowrap px-3 py-1.5">{formatDate(e.createdAt)}</td>
                      <td className="whitespace-nowrap py-1.5 pl-3">{e.notifiedAt ? formatDate(e.notifiedAt) : <span className="text-muted">Not yet</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { show: show === "all" ? "all" : undefined, page: p })} />
    </>
  );
}
