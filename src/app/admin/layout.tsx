/**
 * Admin area layout (outside the (store) group: no shop header/footer).
 * Logged out -> login page; logged in but not an admin -> 403 page.
 * Every admin page is dynamic, never cached and not indexed.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { ADMIN_LOGIN_URL } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s – Jivo Mart admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect(ADMIN_LOGIN_URL);
  if (user.role !== "admin") {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-[#f4f5f2] px-4">
        <div className="w-full max-w-[460px] rounded-md border border-line bg-white p-8 text-center">
          <p className="font-heading text-[48px] font-bold text-primary">403</p>
          <h1 className="mb-3 text-[22px] font-bold">You do not have permission</h1>
          <p className="mb-6 text-[15px]">
            You are logged in as <strong>{user.email}</strong>, which is not a store admin account. Please log in with an admin account.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-outline">
              Go to the shop
            </Link>
            <Link href="/my-account/" className="btn btn-primary">
              My account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const db = await getDb();
  const [orders, reviews, messages] = await Promise.all([
    db.select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, "processing")),
    db.select({ n: count() }).from(schema.reviews).where(eq(schema.reviews.status, "pending")),
    db.select({ n: count() }).from(schema.contactMessages).where(eq(schema.contactMessages.status, "new")),
  ]);

  return (
    <AdminShell userLabel={user.name || user.email} badges={{ orders: orders[0]?.n ?? 0, reviews: reviews[0]?.n ?? 0, messages: messages[0]?.n ?? 0 }}>
      {children}
    </AdminShell>
  );
}
