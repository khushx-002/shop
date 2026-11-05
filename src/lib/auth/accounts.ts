/**
 * Account helpers for server code (NOT server actions, so they cannot be called from the browser).
 */
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { createToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email";
import { accountCreatedEmail } from "@/lib/email-templates";
import { routes } from "@/lib/routes";

/** Used by checkout "Create an account?": creates a customer (if new) and emails a set-password link. */
export async function ensureCustomerAccount(email: string, name: string | null, phone: string | null): Promise<{ userId: number; created: boolean }> {
  const db = await getDb();
  const clean = email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${clean}` });
  if (existing) return { userId: existing.id, created: false };
  const [user] = await db.insert(schema.users).values({ email: clean, name, phone, role: "customer" }).returning();
  const token = await createToken(db, user.id, "set_password");
  const mail = accountCreatedEmail(clean, routes.resetPassword(token));
  await sendMail({ to: clean, subject: mail.subject, html: mail.html });
  return { userId: user.id, created: true };
}
