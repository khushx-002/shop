"use server";
/** Admin actions for reviews, contact messages, newsletter subscribers and customer roles. */
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb, schema } from "@/lib/db";
import { routes } from "@/lib/routes";
import { adminAction } from "../auth";
import { fail, formObject, idField, ok, parseForm } from "../form";

/* ------------------------------------------------------------------ reviews */

const REVIEW_LABEL = { approved: "approved", pending: "moved back to pending", spam: "marked as spam" } as const;

type Db = Awaited<ReturnType<typeof getDb>>;

/**
 * Keeps the product's star average and review count in step with approved reviews.
 * The totals started from the old site (about 50 reviews per product, of which only 10 could be
 * imported), so they are adjusted by one review at a time instead of recounted from our table.
 * delta = +1 when a review becomes approved, -1 when an approved review is hidden or deleted.
 */
async function adjustRating(db: Db, productId: number, rating: number, delta: 1 | -1) {
  const p = schema.products;
  await db
    .update(p)
    .set({
      ratingAvg: sql`case when ${p.ratingCount} + ${delta} <= 0 then 0 else (${p.ratingAvg} * ${p.ratingCount} + ${delta * rating}) / (${p.ratingCount} + ${delta}) end`,
      ratingCount: sql`greatest(${p.ratingCount} + ${delta}, 0)`,
    })
    .where(eq(p.id, productId));
}

async function refreshReviews(productId: number) {
  const db = await getDb();
  revalidateTag("catalog", "max"); // star ratings on cards and product pages
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId), columns: { slug: true } });
  revalidateTag("reviews", "max");
  if (product) revalidatePath(routes.product(product.slug));
  revalidatePath("/admin", "layout");
}

export async function setReviewStatusAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField, status: z.enum(["approved", "pending", "spam"]) }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const before = await db.query.reviews.findFirst({ where: eq(schema.reviews.id, parsed.data.id), columns: { status: true } });
    const [row] = await db.update(schema.reviews).set({ status: parsed.data.status }).where(eq(schema.reviews.id, parsed.data.id)).returning({ productId: schema.reviews.productId, author: schema.reviews.authorName, rating: schema.reviews.rating });
    if (!row || !before) return fail("This review no longer exists.");
    const wasApproved = before.status === "approved";
    const isApproved = parsed.data.status === "approved";
    if (wasApproved !== isApproved) await adjustRating(db, row.productId, row.rating, isApproved ? 1 : -1);
    await refreshReviews(row.productId);
    return ok(`Review by ${row.author} ${REVIEW_LABEL[parsed.data.status]}.`);
  });
}

export async function deleteReviewAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.delete(schema.reviews).where(eq(schema.reviews.id, parsed.data.id)).returning({ productId: schema.reviews.productId, author: schema.reviews.authorName, rating: schema.reviews.rating, status: schema.reviews.status });
    if (!row) return fail("This review no longer exists.");
    if (row.status === "approved") await adjustRating(db, row.productId, row.rating, -1);
    await refreshReviews(row.productId);
    return ok(`Review by ${row.author} deleted.`);
  });
}

/* ------------------------------------------------------------------ contact messages */

export async function setMessageStatusAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField, status: z.enum(["new", "read", "archived"]) }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.update(schema.contactMessages).set({ status: parsed.data.status }).where(eq(schema.contactMessages.id, parsed.data.id)).returning({ id: schema.contactMessages.id });
    if (!row) return fail("This message no longer exists.");
    revalidatePath("/admin", "layout");
    const label = { new: "marked as unread", read: "marked as read", archived: "archived" }[parsed.data.status];
    return ok(`Message ${label}.`);
  });
}

export async function deleteMessageAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.delete(schema.contactMessages).where(eq(schema.contactMessages.id, parsed.data.id)).returning({ id: schema.contactMessages.id });
    if (!row) return fail("This message no longer exists.");
    revalidatePath("/admin", "layout");
    return ok("Message deleted.");
  });
}

/* ------------------------------------------------------------------ subscribers */

export async function deleteSubscriberAction(_prev: unknown, formData: FormData) {
  return adminAction(async () => {
    const parsed = parseForm(z.object({ id: idField }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    const db = await getDb();
    const [row] = await db.delete(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.id, parsed.data.id)).returning({ email: schema.newsletterSubscribers.email });
    if (!row) return fail("This subscriber was already removed.");
    revalidatePath("/admin", "layout");
    return ok(`${row.email} was removed from the newsletter list.`);
  });
}

/* ------------------------------------------------------------------ customers */

export async function setUserRoleAction(_prev: unknown, formData: FormData) {
  return adminAction(async (admin) => {
    const parsed = parseForm(z.object({ id: idField, role: z.enum(["admin", "customer"]) }), formObject(formData));
    if (!parsed.ok) return parsed.state;
    if (parsed.data.id === admin.id) return fail("You cannot change your own role. Ask another admin.");
    const db = await getDb();
    const [row] = await db
      .update(schema.users)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(schema.users.id, parsed.data.id))
      .returning({ email: schema.users.email });
    if (!row) return fail("This user no longer exists.");
    revalidatePath("/admin", "layout");
    return ok(parsed.data.role === "admin" ? `${row.email} is now an admin and can open this admin area.` : `${row.email} is now a normal customer.`);
  });
}
