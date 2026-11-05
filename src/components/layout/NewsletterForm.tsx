"use client";
/**
 * Footer "Sign up to our newsletter" form: one email field inside a rounded box (dark-green footer)
 * with the gold-light Subscribe button. Posts JSON to /api/newsletter/ and shows the answer inline (aria-live).
 */
import { useId, useState } from "react";
import { api } from "@/lib/routes";

type Result = { kind: "ok" | "error"; text: string } | null;

export function NewsletterForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const id = useId();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResult({ kind: "error", text: "Please enter a valid email address." });
      return;
    }
    setPending(true);
    setResult(null);
    try {
      const res = await fetch(api.newsletter, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: String(data.get("website") ?? "") }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;
      if (res.ok && body?.ok) {
        setResult({ kind: "ok", text: body.message || "Thank you for subscribing!" });
        form.reset();
      } else {
        setResult({ kind: "error", text: body?.error || "Something went wrong. Please try again." });
      }
    } catch {
      setResult({ kind: "error", text: "Network error. Please check your connection and try again." });
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      {/* Honeypot: bots fill every field; people never see this one. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {/* .field-like box on dark green: the input and the gold-light button sit inside one rounded box */}
      <div className="flex h-[52px] items-center rounded-[12px] border border-white/25 bg-white/[0.06] p-[5px] transition-[border-color,box-shadow] focus-within:border-gold-light focus-within:shadow-[0_0_0_3px_rgba(243,219,161,0.18)]">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          required
          maxLength={190}
          autoComplete="email"
          placeholder="email@example.com"
          aria-invalid={result?.kind === "error" ? true : undefined}
          aria-describedby={`${id}-msg`}
          className="h-full min-w-0 flex-1 bg-transparent pl-[12px] pr-[10px] !text-[15px] text-white outline-none placeholder:text-[#B9C6C0]"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-full shrink-0 rounded-[9px] bg-gold-light px-[18px] !text-[14px] font-bold text-primary-dark transition-colors hover:bg-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Subscribe"}
        </button>
      </div>
      <p id={`${id}-msg`} role="status" aria-live="polite" className={`min-h-[1px] text-[14px] ${result ? "mt-[10px]" : ""} ${result?.kind === "error" ? "text-[#ffb4a9]" : "text-gold-light"}`}>
        {result?.text}
      </p>
    </form>
  );
}
