"use server";
/**
 * Admin order actions: change status, add tracking, add notes.
 * Every action checks the admin session itself (adminAction) and validates input with zod.
 * Money is never moved here: refunds are done in the Razorpay dashboard.
 */
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb, schema, type Db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { esc, orderStatusEmail } from "@/lib/email-templates";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { safeHttpUrl } from "@/lib/account/format";
import { actorName, adminAction } from "../auth";
import { checkbox, fail, formObject, idField, ok, optionalText, parseForm, requiredText } from "../form";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "../format";

type OrderRow = typeof schema.orders.$inferSelect;

const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${html}</p>`;

async function addEvent(db: Db, orderId: number, type: string, message: string, actor: string) {
  await db.insert(schema.orderEvents).values({ orderId, type, message: message.slice(0, 2000), actor });
}

/** Link in customer emails: the account order page for customers with an account, the private order link for guests. */
function customerLink(order: OrderRow): string {
  return absoluteUrl(order.userId ? routes.accountOrder(order.number) : routes.orderReceived(order.number, order.accessToken));
}

function trackingHtml(order: Pick<OrderRow, "courier" | "trackingNumber" | "trackingUrl">): string {
  const url = safeHttpUrl(order.trackingUrl);
  const parts = [
    order.courier ? `<strong>Courier:</strong> ${esc(order.courier)}` : "",
    order.trackingNumber ? `<strong>Tracking number:</strong> ${esc(order.trackingNumber)}` : "",
    url ? `<a href="${esc(url)}" style="color:#0f4526;">Track your parcel</a>` : "",
  ].filter(Boolean);
  return parts.length ? p(parts.join("<br>")) : "";
}

/** Short text for the customer email per status (no promises we cannot keep). */
function statusText(status: OrderStatus, order: OrderRow): string {
  switch (status) {
    case "processing":
    case "paid":
      return p("We are getting your order ready. We will email you again when it ships.");
    case "shipped":
      return p("Good news! Your order is on its way.") + trackingHtml(order);
    case "completed":
      return p("Your order is complete. Thank you for shopping with Jivo Mart!");
    case "cancelled":
      return p("Your order has been cancelled. If you have any questions, please contact us at info@jivo.in.");
    case "refunded":
      return p("Your order has been refunded. It can take a few working days for the money to show in your account.");
    case "failed":
      return p("The payment for your order did not go through. You can place the order again on our website.");
    default:
      return p("Your order is waiting for payment.");
  }
}

async function emailCustomer(db: Db, order: OrderRow, statusLabel: string, html: string, actor: string, subject?: string): Promise<boolean> {
  const mail = orderStatusEmail({ number: order.number, fullName: order.billing.fullName || "there" }, statusLabel, html, customerLink(order));
  const res = await sendMail({ to: order.email, subject: subject ?? mail.subject, html: mail.html });
  await addEvent(db, order.id, "email", `"${subject ?? mail.subject}" email ${res.ok ? "sent" : `NOT sent (${res.error ?? "error"})`} to ${order.email}.`, actor);
  return res.ok;
}

/** Puts the items of an order back into stock (only packs that track stock). */
async function restoreStock(db: Db, order: OrderRow, actor: string): Promise<number> {
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const notes: string[] = [];
  for (const it of items) {
    if (!it.variationId) continue;
    const rows = await db
      .update(schema.variations)
      .set({ stockQty: sql`coalesce(${schema.variations.stockQty}, 0) + ${it.qty}`, inStock: true, updatedAt: new Date() })
      .where(and(eq(schema.variations.id, it.variationId), eq(schema.variations.manageStock, true)))
      .returning({ stockQty: schema.variations.stockQty });
    if (rows[0]) notes.push(`${it.productName}${it.variationLabel ? ` – ${it.variationLabel}` : ""}: now ${rows[0].stockQty}`);
  }
  await db.update(schema.orders).set({ stockReduced: false }).where(eq(schema.orders.id, order.id));
  await addEvent(db, order.id, "stock_restored", notes.length ? `Stock returned: ${notes.join("; ")}` : "No tracked stock to return.", actor);
  if (notes.length) revalidateTag("catalog", "max");
  return notes.length;
}

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

async function loadOrder(db: Db, id: number) {
  return (await db.query.orders.findFirst({ where: eq(schema.orders.id, id) })) ?? null;
}

/* ------------------------------------------------------------------ status */

const statusSchema = z.object({
  orderId: idField,
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]], { error: "Please choose a status." }),
  notify: checkbox,
  restock: checkbox,
});

export async function updateOrderStatusAction(_prev: unknown, formData: FormData) {
  return adminAction(async (admin) => {
    const parsed = parseForm(statusSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    const { orderId, status, notify, restock } = parsed.data;
    const db = await getDb();
    const order = await loadOrder(db, orderId);
    if (!order) return fail("This order no longer exists.");
    if (order.status === status) return fail(`The order is already "${ORDER_STATUS_LABELS[status]}".`);

    const actor = actorName(admin);
    const [updated] = await db
      .update(schema.orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, order.status)))
      .returning();
    if (!updated) return fail("The order was changed by someone else a moment ago. Please reload the page and try again.");
    await addEvent(db, order.id, "status", `Order status changed from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[status]}.`, actor);

    const notes: string[] = [`Status changed to ${ORDER_STATUS_LABELS[status]}.`];
    if (restock && order.stockReduced && (status === "cancelled" || status === "refunded" || status === "failed")) {
      const returned = await restoreStock(db, updated, actor);
      notes.push(returned ? "Items were returned to stock." : "No pack of this order tracks stock, so nothing was returned to stock.");
    }
    if (notify) {
      const sent = await emailCustomer(db, updated, ORDER_STATUS_LABELS[status], statusText(status, updated), actor);
      notes.push(sent ? `Email sent to ${order.email}.` : "The email could not be sent (see the order notes).");
    }
    if ((status === "cancelled" || status === "refunded") && order.paidAt) {
      notes.push("Remember: refund the money in the Razorpay dashboard – this page does not move money.");
    }
    refreshAdmin();
    return ok(notes.join(" "));
  });
}

/* ------------------------------------------------------------------ tracking */

const trackingSchema = z.object({
  orderId: idField,
  courier: requiredText(80, "Courier"),
  trackingNumber: requiredText(80, "Tracking number"),
  trackingUrl: optionalText(300, "Tracking URL").refine((v) => v == null || safeHttpUrl(v) != null, "Enter a full link starting with https://"),
  notify: checkbox,
});

export async function addTrackingAction(_prev: unknown, formData: FormData) {
  return adminAction(async (admin) => {
    const parsed = parseForm(trackingSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    const { orderId, courier, trackingNumber, trackingUrl, notify } = parsed.data;
    const db = await getDb();
    const order = await loadOrder(db, orderId);
    if (!order) return fail("This order no longer exists.");
    if (!["paid", "processing", "shipped", "completed"].includes(order.status)) {
      return fail(`Only paid orders can be shipped. This order is "${ORDER_STATUS_LABELS[order.status]}".`);
    }
    const actor = actorName(admin);
    const newStatus: OrderStatus = order.status === "completed" ? "completed" : "shipped";
    const [updated] = await db
      .update(schema.orders)
      .set({ courier, trackingNumber, trackingUrl: trackingUrl ? safeHttpUrl(trackingUrl) : null, status: newStatus, updatedAt: new Date() })
      .where(eq(schema.orders.id, order.id))
      .returning();
    await addEvent(db, order.id, "tracking", `Tracking saved: ${courier}, ${trackingNumber}${trackingUrl ? ` (${trackingUrl})` : ""}.`, actor);
    if (order.status !== newStatus) {
      await addEvent(db, order.id, "status", `Order status changed from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[newStatus]}.`, actor);
    }
    const notes = [order.status !== newStatus ? "Tracking saved and the order is now Shipped." : "Tracking saved."];
    if (notify) {
      const sent = await emailCustomer(db, updated, "Shipped", statusText("shipped", updated), actor, `Your Jivo Mart order #${order.number} has been shipped`);
      notes.push(sent ? `Email with the tracking link sent to ${order.email}.` : "The email could not be sent (see the order notes).");
    }
    refreshAdmin();
    return ok(notes.join(" "));
  });
}

/* ------------------------------------------------------------------ notes */

const noteSchema = z.object({
  orderId: idField,
  kind: z.enum(["note", "customer_note"], { error: "Choose who can see the note." }),
  message: requiredText(2000, "Note"),
  notify: checkbox,
});

export async function addOrderNoteAction(_prev: unknown, formData: FormData) {
  return adminAction(async (admin) => {
    const parsed = parseForm(noteSchema, formObject(formData));
    if (!parsed.ok) return parsed.state;
    const { orderId, kind, message, notify } = parsed.data;
    const db = await getDb();
    const order = await loadOrder(db, orderId);
    if (!order) return fail("This order no longer exists.");
    const actor = actorName(admin);
    const text = message.replace(/\r\n/g, "\n");
    await addEvent(db, order.id, kind, text, actor);
    let msg = kind === "customer_note" ? "Note added. The customer can see it on their order page." : "Private note added.";
    if (kind === "customer_note" && notify) {
      const sent = await emailCustomer(
        db,
        order,
        ORDER_STATUS_LABELS[order.status],
        p("We added a note to your order:") + p(esc(text).replace(/\n/g, "<br>")),
        actor,
        `A note was added to your Jivo Mart order #${order.number}`,
      );
      msg += sent ? ` Email sent to ${order.email}.` : " The email could not be sent.";
    }
    refreshAdmin();
    return ok(msg);
  });
}
