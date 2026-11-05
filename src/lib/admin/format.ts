/**
 * Labels and formatting used on admin pages (safe for server and browser).
 */
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/account/format";

export { ORDER_STATUS_LABELS, type OrderStatus };

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

/** Status filter tabs on the orders list ("paid" is only a short in-between state, so it is shown under All). */
export const ORDER_TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending payment" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
];

/** Badge colours per status (Tailwind classes). */
export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-[#f8f1d8] text-[#8a6d00]",
  paid: "bg-[#c6e1c6] text-[#2c4700]",
  processing: "bg-[#c6e1c6] text-[#2c4700]",
  shipped: "bg-[#d6e4f5] text-[#1d4f91]",
  completed: "bg-[#e5e5e5] text-[#454545]",
  cancelled: "bg-[#eee] text-[#777]",
  failed: "bg-[#eba3a3] text-[#761919]",
  refunded: "bg-[#eee] text-[#777]",
};

/** Paid-for statuses (count as revenue / customer spend). */
export const PAID_STATUSES: OrderStatus[] = ["paid", "processing", "shipped", "completed"];

const IST = "Asia/Kolkata";

/** "14 Oct 2026, 3:05 pm" in Indian time. */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST }).format(date);
}

/** "14 Oct 2026" in Indian time. */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: IST }).format(date);
}

/** "2026-10-14" (the Indian calendar day) for <input type="date">. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: IST }).format(d);
}

/** Start of today in Indian time, as a Date. */
export function startOfTodayIST(now = new Date()): Date {
  return new Date(`${toDateInput(now)}T00:00:00+05:30`);
}
