import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { listMessages, pageParam, textParam, type MessageTab } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/admin/format";
import { deleteMessageAction, setMessageStatusAction } from "@/lib/admin/actions/moderation";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/admin/ActionForm";
import { hrefWith, PageTitle, Pagination, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Messages" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const TABS: { key: MessageTab; label: string }[] = [
  { key: "new", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
];

const small = "rounded border border-line px-3 py-1.5 text-[13px] font-semibold hover:border-primary hover:text-primary";

function StatusButton({ id, status, label }: { id: number; status: MessageTab; label: string }) {
  return (
    <ActionForm action={setMessageStatusAction} compact className="flex flex-wrap">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton className={small} pendingText="…">
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

export default async function AdminMessages({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const raw = textParam(sp.status, 20);
  const status: MessageTab = TABS.some((t) => t.key === raw) ? (raw as MessageTab) : "new";
  const page = pageParam(sp.page);
  const data = await listMessages({ status, page });
  const base = "/admin/messages/";

  return (
    <>
      <PageTitle title="Contact messages" />
      <Tabs label="Message status" active={status} tabs={TABS.map((t) => ({ ...t, count: data.counts[t.key] ?? 0, href: hrefWith(base, { status: t.key === "new" ? undefined : t.key }) }))} />
      {data.rows.length === 0 && <p className="rounded-md border border-line bg-white p-8 text-center text-muted">No messages here.</p>}
      <ul className="space-y-3">
        {data.rows.map((m) => (
          <li key={m.id} className="rounded-md border border-line bg-white p-4">
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
              <strong className="text-ink">{m.name}</strong>
              <a href={`mailto:${m.email}`} className="break-all text-primary hover:underline">
                {m.email}
              </a>
              {m.phone && (
                <a href={`tel:${m.phone}`} className="text-primary hover:underline">
                  {m.phone}
                </a>
              )}
              <span className="text-muted">{formatDateTime(m.createdAt)}</span>
            </div>
            {m.subject && <p className="mb-1 text-[14px] font-semibold text-ink">{m.subject}</p>}
            <p className="mb-3 whitespace-pre-line break-words text-[14px] text-ink">{m.message}</p>
            <div className="flex flex-wrap items-start gap-2">
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your message to Jivo Mart"}`)}`}
                className="rounded bg-primary px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-dark"
              >
                Reply by email
              </a>
              {m.status === "new" && <StatusButton id={m.id} status="read" label="Mark as read" />}
              {m.status === "read" && <StatusButton id={m.id} status="new" label="Mark as unread" />}
              {m.status !== "archived" ? <StatusButton id={m.id} status="archived" label="Archive" /> : <StatusButton id={m.id} status="read" label="Move to read" />}
              <ActionForm action={deleteMessageAction} compact className="flex flex-wrap">
                <input type="hidden" name="id" value={m.id} />
                <ConfirmButton question="Delete this message for good?">Delete</ConfirmButton>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { status: status === "new" ? undefined : status, page: p })} />
    </>
  );
}
