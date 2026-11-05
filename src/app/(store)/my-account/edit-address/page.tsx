/** /my-account/edit-address/ – summary of the saved billing and shipping addresses (WooCommerce). */
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { Notice } from "@/components/checkout/Notice";
import { Icon } from "@/components/ui/Icon";
import { getSavedAddresses, type AddressType } from "@/lib/account/addresses";
import { requireAccountUser } from "@/lib/account/session";
import { stateName } from "@/lib/india";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Addresses", path: routes.accountAddresses, noindex: true });

const TITLES: Record<AddressType, string> = { billing: "Billing address", shipping: "Shipping address" };

export default async function AddressesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await requireAccountUser(routes.accountAddresses);
  const saved = await getSavedAddresses(user.id);
  const updated = sp["address-updated"] === "billing" || sp["address-updated"] === "shipping";
  return (
    <AccountShell active="addresses" isAdmin={user.role === "admin"}>
      {updated && (
        <Notice kind="success" className="mb-[24px]">
          Address changed successfully.
        </Notice>
      )}
      <p className="mb-[24px]">The following addresses will be used on the checkout page by default.</p>
      <div className="grid gap-[30px] min-[768px]:grid-cols-2">
        {(["billing", "shipping"] as const).map((type) => {
          const a = saved[type];
          return (
            <section key={type} aria-labelledby={`addr-${type}`} className="card-soft p-[22px] shadow-soft md:p-[26px]">
              <header className="mb-[14px] flex flex-wrap items-baseline justify-between gap-[8px] border-b border-line pb-[12px]">
                <h2 id={`addr-${type}`} className="font-heading text-[22px] font-bold leading-[1.25] text-primary">
                  {TITLES[type]}
                </h2>
                <Link href={routes.accountAddress(type)} className="inline-flex items-center gap-[4px] text-[14px] font-semibold text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark">
                  {a ? "Edit" : "Add"} {TITLES[type]}
                  <Icon name="chevron-right" size={12} />
                </Link>
              </header>
              {a ? (
                <address className="not-italic leading-[1.7]">
                  {[a.fullName, a.company, a.address1, a.address2, `${a.city}, ${stateName(a.state)} ${a.postcode}`, "India"].filter(Boolean).map((l, i) => (
                    <span key={i} className="block">
                      {l}
                    </span>
                  ))}
                  {a.phone && <span className="mt-[6px] block">Phone: {a.phone}</span>}
                  {a.email && <span className="block break-all">Email: {a.email}</span>}
                </address>
              ) : (
                <p>You have not set up this type of address yet.</p>
              )}
            </section>
          );
        })}
      </div>
    </AccountShell>
  );
}
