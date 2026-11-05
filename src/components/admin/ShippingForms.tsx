/** Shipping zone + rate forms (server-rendered markup inside the client ActionForm). */
import type { ShippingRate, ShippingZone } from "@/lib/db/schema";
import { INDIAN_STATES } from "@/lib/india";
import { paiseToInput } from "@/lib/admin/form";
import { deleteRateAction, deleteZoneAction, saveRateAction, saveZoneAction } from "@/lib/admin/actions/shipping";
import { ActionForm, ConfirmButton, FieldError, SubmitButton } from "./ActionForm";
import { Card, Check, Field } from "./ui";

export function ZoneRules() {
  return (
    <div className="mb-6 rounded border border-[#bcd3ee] bg-[#eef4fb] px-4 py-3 text-[14px] text-[#1d3f6e]">
      <strong className="mb-1 block">How the shipping zone is chosen for an address</strong>
      <ol className="ml-5 list-decimal space-y-0.5">
        <li>
          First, a zone whose <strong>PIN code prefix</strong> matches the start of the PIN code (e.g. prefix 110 matches 110064, a full PIN code matches only itself). If that zone also
          ticks states, the customer’s state must be one of them too.
        </li>
        <li>If none matches, a zone that lists the customer’s <strong>state</strong> (and has no PIN codes).</li>
        <li>If still none, the zone marked <strong>Rest of India</strong>.</li>
      </ol>
      <p className="mt-1">Only enabled zones are used, checked in sort order (lowest first). If no zone matches, the customer cannot check out. In a zone, a free-shipping rate wins once the order reaches its minimum; otherwise the flat rates are offered.</p>
    </div>
  );
}

export function ZoneForm({ zone }: { zone?: ShippingZone | null }) {
  const z = zone;
  const chosen = new Set(z?.states ?? []);
  return (
    <ActionForm action={saveZoneAction} aria-label={z ? "Edit zone" : "New zone"}>
      {z && <input type="hidden" name="id" value={z.id} />}
      <Card title="Zone">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Zone name">
            <input id="name" name="name" className="field" defaultValue={z?.name ?? ""} required maxLength={100} />
          </Field>
          <Field name="sortOrder" label="Sort order" hint="Lower numbers are checked first.">
            <input id="sortOrder" name="sortOrder" inputMode="numeric" className="field" defaultValue={z?.sortOrder ?? 0} />
          </Field>
          <Field name="pincodePrefixes" label="PIN code prefixes" hint="Comma separated, e.g. 110, 122, 201 – or full PIN codes like 110027" className="md:col-span-2">
            <textarea id="pincodePrefixes" name="pincodePrefixes" rows={2} className="field" defaultValue={(z?.pincodePrefixes ?? []).join(", ")} />
          </Field>
          <fieldset className="md:col-span-2">
            <legend className="label">States</legend>
            <div className="grid max-h-[260px] grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded border border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
              {INDIAN_STATES.map((s) => (
                <label key={s.code} className="inline-flex items-center gap-2 text-[14px] text-ink">
                  <input type="checkbox" name="states" value={s.code} defaultChecked={chosen.has(s.code)} className="h-4 w-4 accent-[#0f4526]" />
                  {s.name}
                </label>
              ))}
            </div>
            <FieldError name="states" />
          </fieldset>
          <Check name="isRestOfCountry" label="Rest of India (used when no other zone matches)" defaultChecked={z?.isRestOfCountry ?? false} />
          <Check name="enabled" label="Enabled" defaultChecked={z ? z.enabled : true} />
          <Check name="codEnabled" label="Cash on delivery (offered at checkout in this zone)" defaultChecked={z?.codEnabled ?? false} />
          <Field name="codUnavailableNotice" label="Message when cash on delivery is off (optional)" hint="Blue box at checkout for this zone, e.g. “Sorry! COD (Cash On Delivery) is not available at the moment.” Leave empty for no box." className="md:col-span-2">
            <input id="codUnavailableNotice" name="codUnavailableNotice" className="field" defaultValue={z?.codUnavailableNotice ?? ""} maxLength={200} />
          </Field>
          <Field name="note" label="Note (staff only)" hint="Shown on the dashboard, e.g. what the business still has to confirm. Empty it once confirmed." className="md:col-span-2">
            <textarea id="note" name="note" rows={2} className="field" defaultValue={z?.note ?? ""} maxLength={300} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <SubmitButton>{z ? "Save zone" : "Create zone"}</SubmitButton>
        </div>
      </Card>
    </ActionForm>
  );
}

export function DeleteZone({ zone }: { zone: ShippingZone }) {
  return (
    <ActionForm action={deleteZoneAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={zone.id} />
      <ConfirmButton question={`Delete zone “${zone.name}” and its rates?`}>Delete zone</ConfirmButton>
    </ActionForm>
  );
}

/** One rate (or a blank "add rate" form). Each rate has its own form, so ids are prefixed. */
export function RateForm({ zoneId, rate }: { zoneId: number; rate?: ShippingRate }) {
  const r = rate;
  const id = (f: string) => `rate-${r?.id ?? "new"}-${f}`;
  return (
    <div className="rounded border border-line p-4">
      <ActionForm action={saveRateAction} resetOnSuccess={!r} aria-label={r ? `Rate ${r.label}` : "Add rate"}>
        {r && <input type="hidden" name="id" value={r.id} />}
        <input type="hidden" name="zoneId" value={zoneId} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_minmax(0,1fr)_120px_150px_90px]">
          <div>
            <label htmlFor={id("type")} className="label">Type</label>
            <select id={id("type")} name="type" className="field !py-2" defaultValue={r?.type ?? "flat"}>
              <option value="flat">Flat rate</option>
              <option value="free">Free shipping</option>
            </select>
          </div>
          <div>
            <label htmlFor={id("label")} className="label">Label (shown to customers)</label>
            <input id={id("label")} name="label" className="field !py-2" defaultValue={r?.label ?? ""} maxLength={80} placeholder="e.g. Flat rate" />
            <FieldError name="label" />
          </div>
          <div>
            <label htmlFor={id("cost")} className="label">Cost ₹</label>
            <input id={id("cost")} name="cost" inputMode="decimal" className="field !py-2" defaultValue={r ? paiseToInput(r.costPaise) : ""} />
            <FieldError name="cost" />
          </div>
          <div>
            <label htmlFor={id("minOrder")} className="label">Free from order ₹</label>
            <input id={id("minOrder")} name="minOrder" inputMode="decimal" className="field !py-2" defaultValue={paiseToInput(r?.minOrderPaise)} />
            <FieldError name="minOrder" />
          </div>
          <div>
            <label htmlFor={id("sortOrder")} className="label">Sort</label>
            <input id={id("sortOrder")} name="sortOrder" inputMode="numeric" className="field !py-2" defaultValue={r?.sortOrder ?? 0} />
          </div>
        </div>
        <p className="mt-2 text-[13px] text-muted">Cost is used for flat rates. “Free from order” is used for free shipping (empty = always free in this zone).</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-[14px] text-ink">
            <input type="checkbox" name="enabled" defaultChecked={r ? r.enabled : true} className="h-4 w-4 accent-[#0f4526]" />
            Enabled
          </label>
          <SubmitButton className="btn btn-primary !px-4 !py-2">{r ? "Save rate" : "Add rate"}</SubmitButton>
        </div>
      </ActionForm>
      {r && (
        <ActionForm action={deleteRateAction} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="id" value={r.id} />
          <ConfirmButton question={`Delete rate “${r.label}”?`}>Delete rate</ConfirmButton>
        </ActionForm>
      )}
    </div>
  );
}
