import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { listReviews, pageParam, textParam, type ReviewTab } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/admin/format";
import { deleteReviewAction, setReviewStatusAction } from "@/lib/admin/actions/moderation";
import { routes } from "@/lib/routes";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/admin/ActionForm";
import { hrefWith, PageTitle, Pagination, Pill, SearchBox, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Reviews" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const TABS: { key: ReviewTab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "spam", label: "Spam" },
];

const small = "rounded border border-line px-3 py-1.5 text-[13px] font-semibold hover:border-primary hover:text-primary";

function StatusButton({ id, status, label, primary = false }: { id: number; status: ReviewTab; label: string; primary?: boolean }) {
  return (
    <ActionForm action={setReviewStatusAction} compact className="flex flex-wrap">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton className={primary ? "rounded bg-primary px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-primary-dark" : small} pendingText="…">
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

export default async function AdminReviews({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const raw = textParam(sp.status, 20);
  const status: ReviewTab = TABS.some((t) => t.key === raw) ? (raw as ReviewTab) : "pending";
  const q = textParam(sp.q);
  const page = pageParam(sp.page);
  const data = await listReviews({ status, q, page });
  const base = "/admin/reviews/";
  const statusParam = status === "pending" ? undefined : status;

  return (
    <>
      <PageTitle title="Reviews" />
      <Tabs label="Review status" active={status} tabs={TABS.map((t) => ({ ...t, count: data.counts[t.key] ?? 0, href: hrefWith(base, { status: t.key === "pending" ? undefined : t.key }) }))} />
      <SearchBox action={base} q={q} placeholder="Search author, email, product or text" hidden={{ status: statusParam ?? "" }} />
      {data.rows.length === 0 && (
        <p className="rounded-md border border-line bg-white p-8 text-center text-muted">
          No {status} reviews{q ? ` match “${q}”` : ""}.
        </p>
      )}
      <ul className="space-y-3">
        {data.rows.map(({ review: r, productName, productSlug }) => (
          <li key={r.id} className="rounded-md border border-line bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
              <span className="text-[#f5a623]" role="img" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(r.rating)}
                <span className="text-[#ddd]">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
              </span>
              <strong className="text-ink">{r.authorName}</strong>
              {r.authorEmail && (
                <a href={`mailto:${r.authorEmail}`} className="break-all text-primary hover:underline">
                  {r.authorEmail}
                </a>
              )}
              {r.verified ? <Pill tone="green">Verified owner</Pill> : <Pill tone="grey">Not verified</Pill>}
              <span className="text-muted">{formatDateTime(r.createdAt)}</span>
            </div>
            <p className="mb-2 text-[13px]">
              on{" "}
              <a href={routes.product(productSlug)} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline">
                {productName}
              </a>
            </p>
            <p className="mb-3 whitespace-pre-line break-words text-[14px] text-ink">{r.body}</p>
            <div className="flex flex-wrap items-start gap-2">
              {r.status !== "approved" && <StatusButton id={r.id} status="approved" label="Approve" primary />}
              {r.status !== "pending" && <StatusButton id={r.id} status="pending" label={r.status === "approved" ? "Unapprove" : "Not spam"} />}
              {r.status !== "spam" && <StatusButton id={r.id} status="spam" label="Mark as spam" />}
              <ActionForm action={deleteReviewAction} compact className="flex flex-wrap">
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton question="Delete this review for good?">Delete</ConfirmButton>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={data.page} totalPages={data.totalPages} total={data.total} href={(p) => hrefWith(base, { status: statusParam, q, page: p })} />
    </>
  );
}
