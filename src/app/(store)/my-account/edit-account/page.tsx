/** /my-account/edit-account/ – name, email and password of the logged-in customer. */
import { eq } from "drizzle-orm";
import { AccountShell } from "@/components/account/AccountShell";
import { AccountDetailsForm } from "@/components/account/AccountDetailsForm";
import { getDb, schema } from "@/lib/db";
import { requireAccountUser } from "@/lib/account/session";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Account details", path: routes.accountDetails, noindex: true });

export default async function EditAccountPage() {
  const user = await requireAccountUser(routes.accountDetails);
  const db = await getDb();
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { passwordHash: true } });
  return (
    <AccountShell active="details" isAdmin={user.role === "admin"}>
      <AccountDetailsForm initialName={user.name ?? ""} initialEmail={user.email} hasPassword={!!row?.passwordHash} />
    </AccountShell>
  );
}
