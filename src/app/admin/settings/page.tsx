import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/auth";
import { paiseToInput } from "@/lib/admin/form";
import { refreshStoreDataAction, saveSettingsAction } from "@/lib/admin/actions/settings";
import { readSettings } from "@/lib/settings";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { Card, Field, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdminPage();
  const s = await readSettings();

  return (
    <>
      <PageTitle title="Store settings" />
      <ActionForm action={saveSettingsAction} aria-label="Store settings">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Texts on the shop">
            <div className="space-y-4">
              <Field name="announcement_free_delivery" label="Free delivery announcement" hint="Top bar / marquee text.">
                <input id="announcement_free_delivery" name="announcement_free_delivery" className="field" defaultValue={s.announcement_free_delivery} maxLength={200} />
              </Field>
              <Field name="coupon_banner" label="Coupon banner">
                <input id="coupon_banner" name="coupon_banner" className="field" defaultValue={s.coupon_banner} maxLength={300} />
              </Field>
              <Field name="cookie_notice" label="Cookie notice">
                <textarea id="cookie_notice" name="cookie_notice" rows={3} className="field" defaultValue={s.cookie_notice} maxLength={500} />
              </Field>
              <Field name="estimated_delivery" label="Estimated delivery (default)" hint="Shown on product pages that have no own value, e.g. 1 - 5 days.">
                <input id="estimated_delivery" name="estimated_delivery" className="field" defaultValue={s.estimated_delivery} maxLength={60} />
              </Field>
            </div>
          </Card>
          <Card title="Orders and cart">
            <div className="space-y-4">
              <Field name="free_shipping_threshold_paise" label="Free-shipping threshold ₹" hint="Used for the “add ₹X more for free shipping” bar. Empty = no bar. The real shipping price comes from the shipping rates.">
                <input id="free_shipping_threshold_paise" name="free_shipping_threshold_paise" inputMode="decimal" className="field max-w-[220px]" defaultValue={paiseToInput(s.free_shipping_threshold_paise)} />
              </Field>
              <Field name="order_number_prefix" label="Order number prefix" hint="Letters in front of new order numbers, e.g. JM → JM12345678. Existing orders keep their number.">
                <input id="order_number_prefix" name="order_number_prefix" className="field max-w-[220px] uppercase" defaultValue={s.order_number_prefix} maxLength={6} />
              </Field>
              <Field name="max_qty_per_line" label="Maximum quantity per pack in one order">
                <input id="max_qty_per_line" name="max_qty_per_line" inputMode="numeric" className="field max-w-[220px]" defaultValue={s.max_qty_per_line} />
              </Field>
            </div>
          </Card>
        </div>
        <div className="mt-6 flex justify-end">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </ActionForm>

      <Card title="Refresh store data" className="mt-6">
        <ActionForm action={refreshStoreDataAction} aria-label="Refresh store data" compact>
          <p className="mb-3 text-[14px]">
            The shop keeps a copy of products, reviews and settings for up to 1 hour. Changes made in this admin refresh it automatically. Use this button after a data
            import or any change made directly in the database.
          </p>
          <SubmitButton className="btn btn-outline" pendingText="Refreshing…">
            Refresh store data
          </SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
