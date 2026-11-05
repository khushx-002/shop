import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getZone, textParam } from "@/lib/admin/queries";
import { DeleteZone, RateForm, ZoneForm, ZoneRules } from "@/components/admin/ShippingForms";
import { Card, Notice, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Shipping zone" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function EditZone({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();
  const zone = await getZone(Number(id));
  if (!zone) notFound();
  const created = textParam((await searchParams).created, 2) === "1";

  return (
    <>
      <PageTitle title={`Zone: ${zone.name}`} back={{ href: "/admin/shipping/", label: "Shipping" }} />
      {created && <Notice tone="ok">Zone created. Now add at least one rate below.</Notice>}
      <ZoneRules />
      <ZoneForm zone={zone} />

      <Card title="Rates in this zone" className="mt-6">
        <div className="space-y-4">
          {zone.rates.length === 0 && <Notice tone="warn">This zone has no rates yet, so customers in it cannot check out.</Notice>}
          {zone.rates.map((r) => (
            <RateForm key={r.id} zoneId={zone.id} rate={r} />
          ))}
          <div>
            <h3 className="mb-2 text-[15px] font-bold">Add a rate</h3>
            <RateForm zoneId={zone.id} />
          </div>
        </div>
      </Card>

      <Card title="Delete zone" className="mt-8 border-[#f1c6c6]">
        <DeleteZone zone={zone} />
      </Card>
    </>
  );
}
