/** /my-account/edit-address/billing/ and /shipping/ – edit one saved address. */
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressForm } from "@/components/account/AddressForm";
import { getDb, schema } from "@/lib/db";
import { getSavedAddresses, toAddressInput, type AddressType } from "@/lib/account/addresses";
import { requireAccountUser } from "@/lib/account/session";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { eq } from "drizzle-orm";

type Params = Promise<{ type: string }>;

const TITLES: Record<AddressType, string> = { billing: "Billing address", shipping: "Shipping address" };

function asType(t: string): AddressType | null {
  return t === "billing" || t === "shipping" ? t : null;
}

export async function generateMetadata({ params }: { params: Params }) {
  const type = asType((await params).type);
  return pageMetadata({ title: type ? TITLES[type] : "Addresses", path: type ? routes.accountAddress(type) : routes.accountAddresses, noindex: true });
}

export default async function EditAddressPage({ params }: { params: Params }) {
  const type = asType((await params).type);
  if (!type) notFound();
  const user = await requireAccountUser(routes.accountAddress(type));
  const [saved, row] = await Promise.all([
    getSavedAddresses(user.id),
    getDb().then((db) => db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { phone: true } })),
  ]);
  // A new billing address starts with the account name, email and phone.
  const initial = toAddressInput(saved[type], type === "billing" ? { fullName: user.name ?? "", email: user.email, phone: row?.phone ?? "" } : { fullName: user.name ?? "" });
  return (
    <AccountShell active="addresses" isAdmin={user.role === "admin"}>
      <h2 className="mb-[24px] font-heading text-[26px] font-bold leading-[1.2] text-primary">{TITLES[type]}</h2>
      <AddressForm type={type} initial={initial} />
    </AccountShell>
  );
}
