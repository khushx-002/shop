/**
 * GET /admin/subscribers/export/ – newsletter subscribers as a CSV file (admins only).
 */
import { desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

/** CSV cell: quoted, and cells that start like a formula are prefixed with ' so Excel does not run them. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return new Response("You do not have permission to download this file.", { status: user ? 403 : 401, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
  }
  const db = await getDb();
  const rows = await db.select().from(schema.newsletterSubscribers).orderBy(desc(schema.newsletterSubscribers.createdAt));
  const lines = [["email", "signed_up", "source"].map(cell).join(",")];
  for (const r of rows) lines.push([r.email, r.createdAt.toISOString(), r.source].map(cell).join(","));
  const date = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens the file as UTF-8
  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jivo-subscribers-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
