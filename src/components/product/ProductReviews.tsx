"use client";
/**
 * "Customer Reviews" block (old Customer Reviews for WooCommerce plugin): rating summary with
 * a 5→1 star histogram, "Add a review" form, a "Search customer reviews" box, a sort menu and
 * the reviews 10 per page with page numbers (1 2 … 5 »), like the old site. All approved reviews
 * are already on the page, so search, sort and pages work in the browser.
 * New reviews go to POST /api/reviews/ and wait for approval in the admin.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatReviewDate } from "@/components/product/product-utils";
import { ScriptHeading } from "@/components/product/ScriptHeading";
import { Stars } from "@/components/ui/Stars";
import { api } from "@/lib/routes";
import type { ReviewSummary, ReviewView } from "@/lib/types";

const PAGE = 10;

type Sort = "recent" | "highest" | "lowest";

/** Page numbers like the old plugin: first, last and the pages next to the current one; "…" for gaps. */
function pageList(current: number, pages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - current) <= 1) out.push(n);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="shrink-0 text-muted">
      <path d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z" />
      <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
    </svg>
  );
}
const STAR = "#b68a2a"; // theme gold (same as the shared <Stars>)
/** round 40px page buttons, like the catalog pagination */
const PAGE_BTN = "flex h-[40px] min-w-[40px] items-center justify-center rounded-full border px-2 text-[14px] font-semibold leading-none transition-colors";

type Props = {
  productId: number;
  productName: string;
  reviews: ReviewView[];
  summary: ReviewSummary;
  subtitle?: string;
};

export function ProductReviews({ productId, productName, reviews, summary, subtitle }: Props) {
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [formOpen, setFormOpen] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const countRow = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const total = summary.count;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  // the reviews arrive newest first; search and sort run on that list
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q ? reviews.filter((r) => r.body.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q)) : reviews;
    if (sort === "recent") return found;
    return [...found].sort((a, b) => (sort === "highest" ? b.rating - a.rating : a.rating - b.rating) || b.createdAt.localeCompare(a.createdAt));
  }, [reviews, query, sort]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages);
  const from = (current - 1) * PAGE;
  const visible = list.slice(from, from + PAGE);

  const goTo = (n: number) => {
    setPage(n);
    // back to the top of the list; focus the count row so keyboard users start reading from there
    window.setTimeout(() => {
      countRow.current?.focus({ preventScroll: true });
      countRow.current?.scrollIntoView({ block: "start" });
    }, 0);
  };
  const search = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <section aria-labelledby={headingId} className="bg-white px-[16px] py-[48px] md:py-[72px]">
      <div className="mx-auto max-w-[1140px]">
        <ScriptHeading id={headingId} title="Customer Reviews" subtitle={subtitle} large />

        {/* summary */}
        <div className="card-soft mt-[32px] flex flex-col items-center gap-6 px-[18px] py-[22px] shadow-soft md:flex-row md:justify-between md:gap-4 md:px-[40px] md:py-[26px]">
          <div className="flex min-w-[180px] flex-col items-center text-center">
            <p className="font-heading text-[44px] font-bold leading-[1.1] text-primary">{summary.average.toFixed(1)}</p>
            <Stars rating={summary.average} size={20} color={STAR} />
            <p className="mt-[6px] text-[14px] text-muted">
              Based on {total} review{total === 1 ? "" : "s"}
            </p>
          </div>
          <span aria-hidden="true" className="h-px w-[50px] bg-line md:h-[60px] md:w-px" />
          <table className="w-full max-w-[340px] border-collapse text-[14px] text-ink">
            <caption className="sr-only">Rating breakdown</caption>
            <tbody>
              {([5, 4, 3, 2, 1] as const).map((star) => (
                <tr key={star}>
                  <th scope="row" className="whitespace-nowrap py-[3px] pr-[20px] text-left font-normal">
                    {star} star
                  </th>
                  <td className="w-full py-[3px]">
                    <div className="h-[10px] overflow-hidden rounded-full bg-[#eee4d1]">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct(summary.histogram[star])}%` }} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-[3px] pl-[20px] text-right text-muted">{pct(summary.histogram[star])}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span aria-hidden="true" className="h-px w-[50px] bg-line md:h-[60px] md:w-px" />
          <div className="flex min-w-[180px] justify-center">
            <button
              ref={addButton}
              type="button"
              aria-expanded={formOpen}
              aria-controls={`${headingId}-form`}
              onClick={() => setFormOpen((o) => !o)}
              className="btn btn-primary min-h-[46px] px-[24px] text-[15px]"
            >
              Add a review
            </button>
          </div>
        </div>

        {formOpen && (
          <ReviewForm
            id={`${headingId}-form`}
            productId={productId}
            productName={productName}
            onCancel={() => {
              setFormOpen(false);
              addButton.current?.focus();
            }}
          />
        )}

        {/* search (old "Search customer reviews" box) */}
        {total > 0 && (
          <form
            role="search"
            aria-label="Search customer reviews"
            className="mt-[24px] flex gap-[8px]"
            onSubmit={(e) => {
              e.preventDefault();
              search(text);
            }}
          >
            <div className="flex h-[44px] min-w-0 flex-1 items-center gap-[8px] rounded-[10px] border border-[#d9d2c4] bg-white px-[14px] transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(15,69,38,0.12)]">
              <SearchIcon />
              <label htmlFor={`${headingId}-q`} className="sr-only">
                Search customer reviews
              </label>
              <input
                id={`${headingId}-q`}
                type="search"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (!e.target.value) search(""); // clearing the box (or its × button) shows all reviews again
                }}
                placeholder="Search customer reviews"
                maxLength={100}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
              />
            </div>
            <button type="submit" className="btn btn-outline h-[44px] shrink-0 px-[18px]">
              Search
            </button>
          </form>
        )}

        {/* count + sort */}
        <div ref={countRow} tabIndex={-1} className="mt-[16px] flex scroll-mt-[100px] items-center justify-between gap-[10px] rounded-[10px] border border-line bg-cream-light px-[14px] py-[8px] text-[13px] text-muted focus:outline-none">
          <span aria-live="polite">{list.length ? `${from + 1}-${from + visible.length} of ${list.length} reviews` : `0 of ${list.length} reviews`}</span>
          {total > 1 && (
            <>
              <label htmlFor={`${headingId}-sort`} className="sr-only">
                Sort reviews
              </label>
              <select
                id={`${headingId}-sort`}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as Sort);
                  setPage(1);
                }}
                className="min-h-[32px] cursor-pointer rounded-[8px] bg-transparent px-[6px] text-[13px] font-semibold text-primary outline-none focus-visible:outline-2 focus-visible:outline-gold"
              >
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </>
          )}
        </div>
        {total === 0 ? (
          <p className="mt-[24px] text-center text-[15px] text-body">There are no reviews yet. Be the first to review “{productName}”.</p>
        ) : !list.length ? (
          <p className="mt-[24px] text-center text-[15px] text-body">Sorry, no reviews match your current selections</p>
        ) : (
          <ol className="mt-[20px] space-y-[14px]">
            {visible.map((r) => (
              <li key={r.id} className="card-soft flex gap-[14px] p-[16px] md:gap-[20px] md:p-[22px]">
                <span aria-hidden="true" className="flex h-[46px] w-[46px] shrink-0 items-end justify-center overflow-hidden rounded-full border border-gold/30 bg-cream text-gold/45 md:h-[50px] md:w-[50px]">
                  <svg width="38" height="38" viewBox="0 0 40 40">
                    <circle cx="20" cy="14" r="8" fill="currentColor" />
                    <path d="M4 40c1.5-9 8-14 16-14s14.5 5 16 14Z" fill="currentColor" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[15px] font-semibold text-ink">
                      {r.authorName}
                      {r.verified && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/8 px-[8px] py-[2px] text-[11px] font-semibold uppercase tracking-[0.04em] text-primary">
                          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
                            <path d="m2 6.5 2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Verified owner
                        </span>
                      )}
                    </p>
                    <time dateTime={r.createdAt} className="text-[14px] text-muted">
                      {formatReviewDate(r.createdAt)}
                    </time>
                  </div>
                  <Stars rating={r.rating} size={18} color={STAR} className="mt-[6px]" />
                  <p className="mt-[10px] whitespace-pre-line break-words text-[15px] leading-[1.7] text-body">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {pages > 1 && (
          <nav aria-label="Review pages" className="mt-[28px] flex flex-wrap items-center justify-center gap-[8px] text-ink">
            {current > 1 && (
              <button type="button" onClick={() => goTo(current - 1)} aria-label="Previous page" className={`${PAGE_BTN} border-line bg-white text-[18px] hover:border-gold hover:text-gold-dark`}>
                «
              </button>
            )}
            {pageList(current, pages).map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} aria-hidden="true" className="px-[4px] text-[14px] text-muted">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => goTo(n)}
                  aria-label={`Page ${n}`}
                  aria-current={n === current ? "page" : undefined}
                  className={`${PAGE_BTN} ${n === current ? "border-primary bg-primary text-white" : "border-line bg-white text-ink hover:border-gold hover:text-gold-dark"}`}
                >
                  {n}
                </button>
              ),
            )}
            {current < pages && (
              <button type="button" onClick={() => goTo(current + 1)} aria-label="Next page" className={`${PAGE_BTN} border-line bg-white text-[18px] hover:border-gold hover:text-gold-dark`}>
                »
              </button>
            )}
          </nav>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ form */

type Errors = Partial<Record<"rating" | "body" | "authorName" | "authorEmail", string>>;

function ReviewForm({ id, productId, productName, onCancel }: { id: string; productId: number; productName: string; onCancel: () => void }) {
  const { cart } = useCart();
  const user = cart?.user ?? null;
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; text?: string }>({ status: "idle" });
  const firstRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const fid = useId();

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  // fill in name/email once we know who is logged in (only if the visitor has not typed yet)
  const [prefilled, setPrefilled] = useState(!!user);
  if (!prefilled && user) {
    setPrefilled(true);
    if (!name) setName(user.name ?? "");
    if (!email) setEmail(user.email);
  }

  function validate(): Errors {
    const e: Errors = {};
    if (rating < 1 || rating > 5) e.rating = "Please choose a rating.";
    if (body.trim().length < 10) e.body = "Please write at least 10 characters.";
    else if (body.trim().length > 3000) e.body = "Please keep your review under 3000 characters.";
    if (name.trim().length < 2) e.authorName = "Please enter your name.";
    else if (name.trim().length > 80) e.authorName = "Name is too long.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.authorEmail = "Please enter a valid email address.";
    return e;
  }

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setState({ status: "error", text: "Please fix the highlighted fields." });
      const first = Object.keys(e)[0];
      document.getElementById(`${fid}-${first}`)?.focus();
      return;
    }
    const website = (new FormData(ev.currentTarget).get("website") as string) || "";
    setState({ status: "sending" });
    try {
      const res = await fetch(api.reviews, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId, rating, body: body.trim(), authorName: name.trim(), authorEmail: email.trim(), website }),
      });
      const data = (await res.json().catch(() => ({ ok: false, error: "Something went wrong. Please try again." }))) as { ok: boolean; message?: string; error?: string };
      if (data.ok) {
        setState({ status: "done", text: data.message || "Thank you! Your review is awaiting approval." });
        window.setTimeout(() => doneRef.current?.focus(), 0);
      } else {
        setState({ status: "error", text: data.error || "Something went wrong. Please try again." });
      }
    } catch {
      setState({ status: "error", text: "Network error. Please check your connection and try again." });
    }
  }

  if (state.status === "done") {
    return (
      <p ref={doneRef} tabIndex={-1} role="status" className="mt-[20px] rounded-[8px] border-l-[3px] border-gold bg-[#f3eadb] px-[16px] py-[14px] text-[15px] text-primary focus:outline-none">
        {state.text}
      </p>
    );
  }

  const fieldCls = (bad?: string) => `field ${bad ? "border-danger!" : ""}`;

  return (
    <form id={id} onSubmit={submit} noValidate className="mt-[20px] rounded-[22px] bg-cream px-[18px] py-[24px] md:px-[32px] md:py-[32px]" aria-label={`Add a review for ${productName}`}>
      <p className="font-heading text-[22px] font-semibold leading-[1.2] text-primary">Add a review</p>
      <p className="mt-1 text-[14px] text-muted">{productName}</p>

      <fieldset className="mt-[16px]" aria-describedby={errors.rating ? `${fid}-rating-err` : undefined}>
        <legend className="label">
          Rating <span className="req">*</span>
        </legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                ref={n === 1 ? firstRef : undefined}
                id={n === 1 ? `${fid}-rating` : undefined}
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                <path fill={n <= rating ? STAR : "#e2d8c4"} d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8Z" />
              </svg>
            </label>
          ))}
          <span className="ml-2 text-[14px] text-muted">{rating}/5</span>
        </div>
        {errors.rating && (
          <p id={`${fid}-rating-err`} className="mt-1 text-[13px] text-danger">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div className="mt-[16px]">
        <label className="label" htmlFor={`${fid}-body`}>
          Your review <span className="req">*</span>
        </label>
        <textarea
          id={`${fid}-body`}
          rows={5}
          maxLength={3000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={!!errors.body || undefined}
          aria-describedby={errors.body ? `${fid}-body-err` : undefined}
          className={fieldCls(errors.body)}
        />
        {errors.body && (
          <p id={`${fid}-body-err`} className="mt-1 text-[13px] text-danger">
            {errors.body}
          </p>
        )}
      </div>

      <div className="mt-[16px] grid gap-[16px] md:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${fid}-authorName`}>
            Name <span className="req">*</span>
          </label>
          <input
            id={`${fid}-authorName`}
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.authorName || undefined}
            aria-describedby={errors.authorName ? `${fid}-name-err` : undefined}
            className={fieldCls(errors.authorName)}
          />
          {errors.authorName && (
            <p id={`${fid}-name-err`} className="mt-1 text-[13px] text-danger">
              {errors.authorName}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor={`${fid}-authorEmail`}>
            Email <span className="req">*</span>
          </label>
          <input
            id={`${fid}-authorEmail`}
            type="email"
            autoComplete="email"
            maxLength={190}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.authorEmail || undefined}
            aria-describedby={`${fid}-email-help${errors.authorEmail ? ` ${fid}-email-err` : ""}`}
            className={fieldCls(errors.authorEmail)}
          />
          <p id={`${fid}-email-help`} className="mt-1 text-[12px] text-muted">
            Not shown publicly. Used to mark the review as “Verified owner” if you bought this product.
          </p>
          {errors.authorEmail && (
            <p id={`${fid}-email-err`} className="mt-1 text-[13px] text-danger">
              {errors.authorEmail}
            </p>
          )}
        </div>
      </div>

      {/* honeypot: real visitors never see or fill this */}
      <div aria-hidden="true" className="hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="mt-[14px] min-h-[1.2em] text-[14px] text-danger" role="alert" aria-live="assertive">
        {state.status === "error" ? state.text : ""}
      </p>

      <div className="mt-[8px] flex gap-[10px]">
        <button type="submit" disabled={state.status === "sending"} className="btn btn-primary min-h-[46px] px-[26px] text-[15px] disabled:opacity-60">
          {state.status === "sending" ? "Submitting…" : "Submit"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline min-h-[46px] px-[26px] text-[15px]">
          Cancel
        </button>
      </div>
    </form>
  );
}
