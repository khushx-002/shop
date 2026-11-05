"use client";
/**
 * "‹ Return to previous page" (XStore breadcrumb). Goes back in browser history when the
 * visitor came from another page of this site; otherwise (or without JavaScript) opens /shop/.
 */
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";

// URL of the first page loaded in this tab. If the visitor is now on another URL, they got
// here by client-side navigation inside the shop, so history.back() stays on this site.
const firstUrl = typeof window === "undefined" ? null : window.location.href;

export function BackLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={routes.shop}
      onClick={(e) => {
        let sameSite = false;
        try {
          sameSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
        } catch {
          sameSite = false;
        }
        const navigatedInApp = firstUrl !== null && firstUrl !== window.location.href;
        if ((sameSite || navigatedInApp) && window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
      }}
      className={`inline-flex items-center gap-1 text-[14px] text-ink transition hover:text-[var(--color-active)] ${className}`}
    >
      <Icon name="chevron-left" size={11} />
      Return to previous page
    </a>
  );
}
