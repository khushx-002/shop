/**
 * Plain types and helpers for showing orders to customers (my-account and track-order).
 * No server imports here, so the browser (track-order form) can use them too.
 */
import type { OrderAddress } from "@/lib/db/schema";

export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "completed" | "cancelled" | "failed" | "refunded";

/** Same wording as WooCommerce order statuses. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  refunded: "Refunded",
};

export type OrderLineView = {
  name: string;
  variationLabel: string | null;
  href: string | null; // product page, when the product still has a slug
  qty: number;
  lineTotalPaise: number;
};

export type OrderUpdateView = { date: string; text: string };

/** Everything a customer may see about one order (plain JSON, safe to send to the browser). */
export type OrderView = {
  number: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string; // ISO
  itemCount: number; // sum of quantities
  items: OrderLineView[];
  subtotalPaise: number;
  discountPaise: number;
  couponCode: string | null;
  shippingPaise: number;
  shippingMethod: string | null;
  totalPaise: number;
  paymentMethod: string | null;
  customerNote: string | null;
  billing: OrderAddress;
  shipping: OrderAddress;
  tracking: { courier: string | null; number: string | null; url: string | null } | null;
  updates: OrderUpdateView[];
};

/** "October 14, 2026" (WooCommerce date format "F j, Y", Indian time). */
export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

/** "October 14, 2026 at 3:05 pm" for order updates. */
export function formatOrderDateTime(iso: string): string {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(d).toLowerCase();
  return `${formatOrderDate(iso)} at ${time}`;
}

/** Only http(s) links are shown (a tracking URL typed by an admin must never become a javascript: link). */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
