import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { ZoneForm, ZoneRules } from "@/components/admin/ShippingForms";
import { PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "New shipping zone" };

export default async function NewZone() {
  await requireAdminPage();
  return (
    <>
      <PageTitle title="New shipping zone" back={{ href: "/admin/shipping/", label: "Shipping" }} />
      <ZoneRules />
      <ZoneForm />
      <p className="mt-4 text-[14px] text-muted">After creating the zone you can add its rates.</p>
    </>
  );
}
