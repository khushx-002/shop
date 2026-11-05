"use client";
/** Small notices in the corner (e.g. "Product added to wishlist", error messages from the cart). */
import { useCart } from "@/components/cart/CartProvider";
import { Icon } from "@/components/ui/Icon";

export function Toasts() {
  const { toasts, dismissToast } = useCart();
  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--mobile-panel-height)+12px)] left-1/2 z-[80] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 min-[1025px]:bottom-6" aria-live="polite" role="status">
      {toasts.map((t) => (
        // White card with a coloured left accent: red for errors, green for success, gold for other notices.
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-[12px] border border-l-4 border-line bg-white px-4 py-3 text-[14px] leading-[1.5] text-ink shadow-lift ${t.kind === "error" ? "border-l-danger" : t.kind === "success" ? "border-l-primary" : "border-l-gold"}`}
        >
          <Icon
            name={t.kind === "error" ? "info" : "check-circle"}
            size={18}
            className={`mt-0.5 shrink-0 ${t.kind === "error" ? "text-danger" : t.kind === "success" ? "text-primary" : "text-gold-dark"}`}
          />
          <p className="flex-1">{t.text}</p>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="shrink-0 rounded-full text-muted transition-colors hover:text-primary">
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
