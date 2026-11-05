/**
 * Notice bar ("Coupon code applied successfully.", errors, info) in the heritage look:
 * rounded box with a coloured left edge – success = soft green, error = soft red,
 * info = cream with a gold edge.
 */
import { Icon } from "@/components/ui/Icon";

export type NoticeKind = "success" | "error" | "info";

export function Notice({ kind, children, className = "", id }: { kind: NoticeKind; children: React.ReactNode; className?: string; id?: string }) {
  const tone =
    kind === "success"
      ? "border-primary bg-sage text-primary"
      : kind === "error"
        ? "border-danger bg-[#fdecea] text-[#8e1c1c]"
        : "border-gold bg-cream text-ink";
  const iconTone = kind === "info" ? "text-gold-dark" : "";
  return (
    <div id={id} role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-[10px] rounded-[12px] border-l-[4px] px-[18px] py-[13px] text-[15px] leading-[1.55] ${tone} ${className}`}>
      <Icon name={kind === "success" ? "check-circle" : "info"} size={18} className={`mt-[2px] shrink-0 ${iconTone}`} />
      <div className="min-w-0 flex-1 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  );
}
