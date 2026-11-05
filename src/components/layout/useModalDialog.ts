"use client";
/**
 * Shared behaviour for the off-canvas panels and the search popup.
 *
 * They are native <dialog> elements opened with showModal(), which gives us for free:
 * - focus stays inside the dialog (the rest of the page becomes inert),
 * - the Esc key closes it (we listen to the "close" event and update React state).
 * On top of that this hook locks page scrolling while open, moves focus to `initialFocus`
 * and gives focus back to the button that opened the dialog when it closes.
 *
 *   const ref = useModalDialog(open, () => setOpen(false), { initialFocus: inputRef });
 *   <dialog ref={ref}>...</dialog>
 */
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";

let lockCount = 0;
let savedStyle: { overflow: string; gutter: string } | null = null;

function lockScroll() {
  const root = document.documentElement;
  if (lockCount++ > 0) return;
  savedStyle = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
  // Keep the scrollbar's space so the page behind the panel does not jump sideways.
  if (root.scrollHeight > root.clientHeight) root.style.scrollbarGutter = "stable";
  root.style.overflow = "hidden";
}

function unlockScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0 || !savedStyle) return;
  const root = document.documentElement;
  root.style.overflow = savedStyle.overflow;
  root.style.scrollbarGutter = savedStyle.gutter;
  savedStyle = null;
}

export function useModalDialog(open: boolean, onClose: () => void, options: { initialFocus?: RefObject<HTMLElement | null> } = {}) {
  const ref = useRef<HTMLDialogElement>(null);
  const handleClose = useEffectEvent(() => onClose());
  const initialFocus = options.initialFocus;

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    lockScroll();
    initialFocus?.current?.focus({ preventScroll: true });
    // Esc (or any native close) → tell React. Removed before we close it ourselves below.
    const onNativeClose = () => handleClose();
    dialog.addEventListener("close", onNativeClose);
    return () => {
      dialog.removeEventListener("close", onNativeClose);
      if (dialog.open) dialog.close();
      unlockScroll();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, initialFocus]);

  return ref;
}

/** Closes a panel when the visitor follows a link inside it (client-side navigation keeps the header mounted). */
export function closeOnLinkClick(close: () => void) {
  return (event: React.MouseEvent<HTMLElement>) => {
    const link = (event.target as Element).closest("a[href]");
    if (link && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey) close();
  };
}
