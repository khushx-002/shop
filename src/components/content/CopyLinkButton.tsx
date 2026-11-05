"use client";
/** "Copy link" share button: copies the page URL and says so (aria-live). */
import { useState } from "react";

export function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  };

  return (
    <>
      <button type="button" onClick={copy} className={className} title="Copy link">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </svg>
        <span className="sr-only">Copy link</span>
      </button>
      <span role="status" aria-live="polite" className={state === "idle" ? "sr-only" : "text-[13px] text-muted"}>
        {state === "copied" ? "Link copied" : state === "failed" ? "Could not copy – please copy the address bar" : ""}
      </span>
    </>
  );
}
