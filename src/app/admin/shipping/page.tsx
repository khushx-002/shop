import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listZones, textParam } from "@/lib/admin/queries";
import { paiseToInput } from "@/lib/admin/form";
import { saveThresholdAction } from "@/lib/admin/actions/settings";
import { readSettings } from "@/lib/settings";
import { stateName } from "@/lib/india";
import { formatPaise } from "@/lib/pricing";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Card, EmptyRow, Field, Notice, PageTitle, Pill, Table } from "@/components/admin/ui";
import { ZoneRules } from "@/components/admin/ShippingForms";

export const metadata: Metadata = { title: "Shipping" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminShipping({ searchParams }: { searchParams: SP }) {
  await requireAdminPage();
  const sp = await searchParams;
  const deleted = textParam(sp.deleted, 100);
  const [zones, settings] = await Promise.all([listZones(), readSettings()]);

  return (
    <>
      <PageTitle title="Shipping">
        <Link href="/admin/shipping/new/" className="btn btn-primary !px-4 !py-2">
          + Add zone
        </Link>
      </PageTitle>
      {deleted && <Notice tone="ok">Zone “{deleted}” deleted.</Notice>}
      <ZoneRules />

      <Table head={["Zone", "Matches", "Rates", "Status"]} caption="Shipping zones">
        {zones.length === 0 && <EmptyRow cols={4} text="No shipping zones. Customers cannot check out until you add one." />}
        {zones.map((z) => (
          <tr key={z.id} className="hover:bg-[#fafaf8]">
            <td>
              <Link href={`/admin/shipping/${z.id}/`} className="font-semibold text-primary hover:underline">
                {z.name}
              </Link>
              <span className="block text-[12px] text-muted">Sort {z.sortOrder}</span>
              {z.note && <span className="mt-1 block max-w-[320px] text-[12px] text-[#8a6d00]">Note: {z.note}</span>}
            </td>
            <td className="max-w-[360px] text-[13px]">
              {z.pincodePrefixes.length > 0 && (
                <span className="block">
                  PIN starts with: {z.pincodePrefixes.slice(0, 12).join(", ")}
                  {z.pincodePrefixes.length > 12 && ` and ${z.pincodePrefixes.length - 12} more`}
                </span>
              )}
              {z.states.length > 0 && <span className="block">States: {z.states.map(stateName).join(", ")}</span>}
              {z.isRestOfCountry && <span className="block font-semibold">Rest of India</span>}
              <span className="block text-muted">{z.codEnabled ? "Cash on delivery: yes" : `Cash on delivery: no${z.codUnavailableNotice ? " (shows a message)" : ""}`}</span>
            </td>
            <td className="text-[13px]">
              {z.rates.length === 0 && <span className="text-danger">No rates</span>}
              {z.rates.map((r) => (
                <span key={r.id} className={`block ${r.enabled ? "" : "text-muted line-through"}`}>
                  {r.label}: {r.type === "free" ? `free${r.minOrderPaise != null ? ` from ${formatPaise(r.minOrderPaise)}` : ""}` : formatPaise(r.costPaise)}
                </span>
              ))}
            </td>
            <td>{z.enabled ? <Pill tone="green">Enabled</Pill> : <Pill tone="grey">Disabled</Pill>}</td>
          </tr>
        ))}
      </Table>

      <Card title="Free-shipping progress bar" className="mt-8 max-w-[560px]">
        <p className="mb-3 text-[14px]">
          The cart shows “add ₹X more for free shipping” up to this amount. It does not change the shipping price itself – that comes from the free-shipping rates above. Keep both the same.
        </p>
        <ActionForm action={saveThresholdAction} aria-label="Free-shipping threshold">
          <Field name="free_shipping_threshold_paise" label="Free-shipping threshold ₹" hint="Empty = do not show the progress bar.">
            <input id="free_shipping_threshold_paise" name="free_shipping_threshold_paise" inputMode="decimal" className="field max-w-[200px]" defaultValue={paiseToInput(settings.free_shipping_threshold_paise)} />
          </Field>
          <div className="mt-4">
            <SubmitButton>Save threshold</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
