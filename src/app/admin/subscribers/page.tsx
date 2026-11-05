import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { listSubscribers, pageParam, textParam } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/admin/format";
import { deleteSubscriberAction } from "@/lib/admin/actions/moderation";
import { ActionForm, ConfirmButton } from "@/components/admin/ActionForm";
import { EmptyRow, hrefWith, PageTitle, Pagination, SearchBox, Table } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Subscribers" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminSubscribers({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = textParam(sp.q);
  const page = pageParam(sp.page);
  const data = await listSubscribers({ q, page });
  const base = "/admin/subscribers/";

  return (
    <>
      <PageTitle title="Newsletter subscribers">
        {/* plain link: the browser downloads the CSV file */}
        <a href={`${base}export/`} className="btn btn-primary !px-4 !py-2" download>
          Download CSV
        </a>
      </PageTitle>
      <p className="-mt-3 mb-4 text-[14px] text-muted">People who signed up with the newsletter form in the footer. Remove someone here when they ask to unsubscribe.</p>
      <SearchBox action={base} q={q} placeholder="Search email" />
      <Table head={["Email", "Signed up", "Source", ""]} caption="Newsletter subscribers">
        {data.rows.length === 0 && <EmptyRow cols={4} text={q ? `No subscribers match “${q}”.` : "No subscribers yet."} />}
        {data.rows.map((s) => (
          <tr key={s.id}>
            <td className="break-all">{s.email}</td>
            <td className="whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
            <td>{s.source}</td>
            <td className="text-right">
              <ActionForm action={deleteSubscriberAction} compact className="flex flex-wrap justify-end">
                <input type="hidden" name="id" value={s.id} />
                <ConfirmButton question="Remove from the list?" confirmText="Yes, remove">
                  Remove
                </ConfirmButton>
              </ActionForm>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { q, page: p })} />
    </>
  );
}
