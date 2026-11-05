"use client";
/**
 * Cookie notice box (bottom-right on desktop, full width above the bottom bar on phones), like the
 * old XStore popup. The choice is remembered in localStorage. Nothing is rendered on the server
 * (the box is position: fixed, so showing it after load does not move the page).
 */
import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { CloseIcon } from "./icons";

const KEY = "jm-cookie-consent";

function storedChoice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return "blocked"; // storage blocked: do not nag on every page
  }
}

const noop = () => () => {};

export function CookieNotice() {
  // Hidden on the server and during hydration (third argument), real value right after: no hydration mismatch.
  const alreadyChosen = useSyncExternalStore(noop, () => storedChoice() !== null, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (alreadyChosen || dismissed) return null;

  const choose = (value: "accepted" | "closed") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* private mode: just hide it for this page view */
    }
    setDismissed(true);
  };

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-[var(--mobile-panel-height)] z-50 m-[15px] rounded-[16px] border border-line bg-white px-[22px] pb-[24px] pt-[26px] text-center text-[14px] text-body shadow-soft transition-[opacity,translate] duration-500 starting:translate-y-4 starting:opacity-0 motion-reduce:transition-none min-[768px]:left-auto min-[768px]:w-[390px] min-[768px]:px-[28px] min-[1025px]:bottom-0"
    >
      <button
        type="button"
        onClick={() => choose("closed")}
        aria-label="Close cookie notice"
        className="absolute right-[10px] top-[10px] flex size-[28px] items-center justify-center rounded-full text-muted transition-colors hover:bg-cream hover:text-primary"
      >
        <CloseIcon size={10} />
      </button>
      <p className="leading-[1.6]">
        This website uses cookies to improve your experience. By using this website you agree to our{" "}
        <Link href={routes.privacy} className="font-semibold !text-primary underline decoration-gold/60 underline-offset-[3px] transition-colors hover:!text-gold-dark">
          Privacy Policy
        </Link>
        .
      </p>
      <button type="button" onClick={() => choose("accepted")} className="btn btn-primary mt-[20px] h-[42px] !px-[28px] !py-0">
        OK, I agree
      </button>
    </section>
  );
}
