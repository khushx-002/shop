/** Create / edit coupon form (server-rendered markup inside the client ActionForm). */
import type { Coupon } from "@/lib/db/schema";
import { paiseToInput } from "@/lib/admin/form";
import { toDateInput } from "@/lib/admin/format";
import { deleteCouponAction, saveCouponAction } from "@/lib/admin/actions/coupons";
import { ActionForm, ConfirmButton, SubmitButton } from "./ActionForm";
import { Card, Check, Field } from "./ui";

export function CouponForm({ coupon }: { coupon?: Coupon | null }) {
  const c = coupon;
  return (
    <>
      <ActionForm action={saveCouponAction} aria-label={c ? "Edit coupon" : "New coupon"}>
        {c && <input type="hidden" name="id" value={c.id} />}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Coupon">
            <div className="space-y-4">
              <Field name="code" label="Code" hint="Customers type this at the cart. Saved in capitals, e.g. JIVO200.">
                <input id="code" name="code" className="field uppercase" defaultValue={c?.code ?? ""} required maxLength={40} autoCapitalize="characters" />
              </Field>
              <Field name="type" label="Discount type">
                <select id="type" name="type" className="field" defaultValue={c?.type ?? "fixed_cart"}>
                  <option value="fixed_cart">Fixed cart discount (₹)</option>
                  <option value="percent">Percentage discount (%)</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </Field>
              <Field name="amount" label="Amount" hint="Rupees for a fixed discount (e.g. 200), a whole percent for a percentage (e.g. 10). Not used for free shipping.">
                <input
                  id="amount"
                  name="amount"
                  inputMode="decimal"
                  className="field"
                  defaultValue={c ? (c.type === "fixed_cart" ? paiseToInput(c.amount) : c.type === "percent" ? String(c.amount) : "") : ""}
                />
              </Field>
              <Field name="description" label="Description (staff only)">
                <input id="description" name="description" className="field" defaultValue={c?.description ?? ""} maxLength={200} />
              </Field>
              <Check name="active" label="Active (customers can use it)" defaultChecked={c ? c.active : true} />
            </div>
          </Card>
          <Card title="Limits">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="minSpend" label="Minimum spend ₹" hint="Cart subtotal needed. Empty = none.">
                <input id="minSpend" name="minSpend" inputMode="decimal" className="field" defaultValue={paiseToInput(c?.minSpendPaise)} />
              </Field>
              <Field name="maxSpend" label="Maximum spend ₹" hint="Empty = none.">
                <input id="maxSpend" name="maxSpend" inputMode="decimal" className="field" defaultValue={paiseToInput(c?.maxSpendPaise)} />
              </Field>
              <Field name="expiresAt" label="Expiry date" hint="Works until the end of this day (India time). Empty = never.">
                <input id="expiresAt" name="expiresAt" type="date" className="field" defaultValue={toDateInput(c?.expiresAt)} />
              </Field>
              <Field name="usageLimit" label="Usage limit" hint="Total uses. Empty = unlimited.">
                <input id="usageLimit" name="usageLimit" inputMode="numeric" className="field" defaultValue={c?.usageLimit ?? ""} />
              </Field>
              <Field name="perUserLimit" label="Limit per customer" hint="Uses per email address. Empty = unlimited.">
                <input id="perUserLimit" name="perUserLimit" inputMode="numeric" className="field" defaultValue={c?.perUserLimit ?? ""} />
              </Field>
              {c && (
                <div>
                  <span className="label">Used</span>
                  <p className="py-2 text-[15px] text-ink">
                    {c.usedCount} time{c.usedCount === 1 ? "" : "s"}
                    {c.usageLimit != null ? ` of ${c.usageLimit}` : ""}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div className="mt-6 flex justify-end">
          <SubmitButton>{c ? "Save coupon" : "Create coupon"}</SubmitButton>
        </div>
      </ActionForm>

      {c && (
        <Card title="Delete coupon" className="mt-8 border-[#f1c6c6]">
          <ActionForm action={deleteCouponAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={c.id} />
            <p className="text-[14px]">Customers who have it in their cart will see that the coupon no longer exists.</p>
            <ConfirmButton question={`Delete coupon ${c.code}?`}>Delete coupon</ConfirmButton>
          </ActionForm>
        </Card>
      )}
    </>
  );
}
