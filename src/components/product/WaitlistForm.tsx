"use client";
/**
 * Out-of-stock notice + waiting list (like the old site's waitlist plugin). Posts to /api/waitlist/.
 * Heritage look: a cream notice box with a gold left border and a green "Notify when available" button.
 * The email form only opens after the bar is clicked, so cards and product pages stay compact.
 * `message={null}` shows only the bar (home "In The Spotlight" cards).
 */
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/routes";

type Props = { productId: number; variationId?: number | null; message?: string | null; className?: string };

/** Small bell, as on the old "Notify when available" button. */
function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function WaitlistForm({ productId, variationId = null, message = "This product is currently out of stock and unavailable.", className = "" }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; text?: string }>({ status: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const honeypot = (new FormData(e.currentTarget).get("website") as string) || "";
    setState({ status: "sending" });
    try {
      const res = await fetch(api.waitlist, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId, variationId, email, consent, website: honeypot }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      setState(data.ok ? { status: "done", text: data.message } : { status: "error", text: data.error });
    } catch {
      setState({ status: "error", text: "Network error. Please try again." });
    }
  }

  return (
    <div className={className}>
      {message && (
        <p className="stock out-of-stock flex items-center gap-[8px] rounded-[8px] border-l-[3px] border-gold bg-[#f3eadb] px-[14px] py-[10px] text-[14px] text-ink">
          <Icon name="info" size={16} className="shrink-0 text-gold-dark" />
          {message}
        </p>
      )}
      {state.status === "done" ? (
        <p className="mt-2 rounded-[8px] border-l-[3px] border-gold bg-[#f3eadb] px-[14px] py-[10px] text-[14px] text-primary" role="status">
          {state.text}
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={`${id}-form`}
          className={`btn btn-primary min-h-[40px] px-[16px] py-[8px] text-[13px] ${message ? "mt-[12px]" : ""}`}
        >
          <BellIcon />
          Notify when available
        </button>
      ) : (
        <form id={`${id}-form`} onSubmit={submit} className={`flex flex-col gap-2 text-left ${message ? "mt-[12px]" : ""}`} noValidate>
          <label htmlFor={`${id}-email`} className="sr-only">
            Email address
          </label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field py-[10px] text-[14px]"
          />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <label className="flex items-start gap-2 text-[13px] text-body">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[var(--color-primary)]" required />
            <span>I consent to being contacted by the store owner</span>
          </label>
          <button type="submit" className="btn btn-primary min-h-[40px] px-[16px] py-[9px] text-[13px]" disabled={state.status === "sending" || !email || !consent}>
            {state.status === "sending" ? "Please wait…" : "Join waiting list"}
          </button>
          {state.status === "error" && (
            <p className="text-[13px] text-danger" role="alert">
              {state.text}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
