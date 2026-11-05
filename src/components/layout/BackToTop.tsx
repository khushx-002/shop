"use client";
/**
 * Round green "back to top" button (gold on hover). Appears after scrolling down one screen.
 * Sits above the mobile bottom bar on tablet/phone.
 */
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function BackToTop() {
  const visible = useSyncExternalStore(
    subscribe,
    () => window.scrollY > window.innerHeight * 0.8,
    () => false,
  );

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    document.getElementById("main")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed bottom-[calc(var(--mobile-panel-height)+15px)] right-[15px] z-30 flex size-[46px] items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_rgba(15,69,38,0.2)] transition-all duration-200 hover:bg-gold motion-reduce:transition-none min-[1025px]:bottom-[30px] min-[1025px]:right-[30px] ${visible ? "visible translate-y-0 opacity-100" : "invisible translate-y-[15px] opacity-0"}`}
    >
      <Icon name="arrow-up" size={18} strokeWidth={1.8} />
    </button>
  );
}
