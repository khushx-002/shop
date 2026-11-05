"use client";
/**
 * The sticky white header (with the slim green top bar above it). `position: sticky` keeps its own
 * space in the page, so nothing jumps when it sticks. It sticks at top: -34px, so the 34px top bar
 * scrolls away and only the main header row stays on screen. A soft shadow appears once the page
 * is scrolled.
 */
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function HeaderBar({ children }: { children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(
    subscribe,
    () => window.scrollY > 4,
    () => false,
  );
  return (
    <header
      id="site-header"
      className={`sticky -top-[34px] z-40 border-b border-primary/10 bg-white/95 text-ink backdrop-blur-md transition-shadow duration-200 motion-reduce:transition-none ${scrolled ? "shadow-[0_10px_30px_rgba(15,69,38,0.08)]" : ""}`}
    >
      {children}
    </header>
  );
}
