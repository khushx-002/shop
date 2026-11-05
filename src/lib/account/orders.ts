/**
 * Order lookups for customers (server only):
 *  - my-account order list and order view (only the logged-in owner)
 *  - track-order (order number + billing email must both match)
 */
import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { routes } from "@/lib/routes";
import { paymentMethodTitle } from "@/lib/checkout/payment-methods";
import { ORDER_STATUS_LABELS, safeHttpUrl, type OrderView } from "./format";

type OrderRow = typeof schema.orders.$inferSelect;
type ItemRow = typeof schema.orderItems.$inferSelect;
type EventRow = typeof schema.orderEvents.$inferSelect;

/** Order events a customer may read (everything else is internal: payment ids, errors...). */
const CUSTOMER_EVENT_TYPES = ["customer_note", "status"];

export const ORDERS_PER_PAGE = 10;

function toView(order: OrderRow, items: ItemRow[], events: EventRow[]): OrderView {
  const hasTracking = !!(order.trackingNumber || order.trackingUrl || order.courier);
  return {
    number: order.number,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
    createdAt: order.createdAt.toISOString(),
    itemCount: items.reduce((n, i) => n + i.qty, 0),
    items: items.map((i) => ({
      name: i.productName,
      variationLabel: i.variationLabel,
      href: i.productSlug ? routes.product(i.productSlug) : null,
      qty: i.qty,
      lineTotalPaise: i.lineTotalPaise,
    })),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    couponCode: order.couponCode,
    shippingPaise: order.shippingPaise,
    shippingMethod: order.shippingMethod,
    totalPaise: order.totalPaise,
    paymentMethod: paymentMethodTitle(order.paymentProvider),
    customerNote: order.customerNote,
    billing: order.billing,
    shipping: order.shipping,
    tracking: hasTracking ? { courier: order.courier, number: order.trackingNumber, url: safeHttpUrl(order.trackingUrl) } : null,
    updates: events
      .filter((e) => CUSTOMER_EVENT_TYPES.includes(e.type) && e.message)
      .map((e) => ({ date: e.createdAt.toISOString(), text: e.message ?? "" })),
  };
}

async function loadView(order: OrderRow): Promise<OrderView> {
  const db = await getDb();
  const [items, events] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)).orderBy(asc(schema.orderItems.id)),
    db
      .select()
      .from(schema.orderEvents)
      .where(and(eq(schema.orderEvents.orderId, order.id), inArray(schema.orderEvents.type, CUSTOMER_EVENT_TYPES)))
      .orderBy(asc(schema.orderEvents.createdAt), asc(schema.orderEvents.id)),
  ]);
  return toView(order, items, events);
}

export type OrderListRow = { number: string; createdAt: string; status: OrderView["status"]; statusLabel: string; totalPaise: number; itemCount: number };

/** One page of the customer's orders, newest first. */
export async function listCustomerOrders(userId: number, page: number): Promise<{ rows: OrderListRow[]; total: number; totalPages: number }> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.orders).where(eq(schema.orders.userId, userId));
  const total = Number(n);
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  if (!total) return { rows: [], total, totalPages };
  const orders = await db
    .select({
      id: schema.orders.id,
      number: schema.orders.number,
      createdAt: schema.orders.createdAt,
      status: schema.orders.status,
      totalPaise: schema.orders.totalPaise,
    })
    .from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt), desc(schema.orders.id))
    .limit(ORDERS_PER_PAGE)
    .offset((page - 1) * ORDERS_PER_PAGE);
  // Item counts (sum of quantities) for the orders on this page.
  const counts = orders.length
    ? await db
        .select({ orderId: schema.orderItems.orderId, qty: sql<number>`coalesce(sum(${schema.orderItems.qty}), 0)` })
        .from(schema.orderItems)
        .where(inArray(schema.orderItems.orderId, orders.map((o) => o.id)))
        .groupBy(schema.orderItems.orderId)
    : [];
  const qtyOf = new Map(counts.map((c) => [c.orderId, Number(c.qty)]));
  return {
    total,
    totalPages,
    rows: orders.map((o) => ({
      number: o.number,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
      totalPaise: o.totalPaise,
      itemCount: qtyOf.get(o.id) ?? 0,
    })),
  };
}

/** The order, only when it belongs to this user (null otherwise, so nobody can read other orders). */
export async function getCustomerOrder(userId: number, number: string): Promise<OrderView | null> {
  if (!number || number.length > 40) return null;
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: and(eq(schema.orders.number, number), eq(schema.orders.userId, userId)) });
  return order ? loadView(order) : null;
}

/**
 * Track-order lookup: order number and billing email must both match (case-insensitive).
 * Returns null in every failure case so the caller cannot tell "unknown order" from "wrong email".
 */
export async function findOrderForTracking(number: string, email: string): Promise<OrderView | null> {
  const db = await getDb();
  const order = await db.query.orders.findFirst({
    where: and(sql`lower(${schema.orders.number}) = ${number.toLowerCase()}`, sql`lower(${schema.orders.email}) = ${email.toLowerCase()}`),
  });
  return order ? loadView(order) : null;
}
