"use client";
/** Forms on the admin order page: change status, add tracking, add a note. */
import { useState } from "react";
import { addOrderNoteAction, addTrackingAction, updateOrderStatusAction } from "@/lib/admin/actions/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@/lib/admin/format";
import { ActionForm, FieldError, SubmitButton } from "./ActionForm";

export function StatusForm({ orderId, status, paid, stockReduced }: { orderId: number; status: OrderStatus; paid: boolean; stockReduced: boolean }) {
  const [next, setNext] = useState<OrderStatus>(status);
  const cancelling = next === "cancelled" || next === "refunded" || next === "failed";
  return (
    <ActionForm action={updateOrderStatusAction} aria-label="Change order status">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="status" className="label">
        Order status
      </label>
      <select id="status" name="status" className="field" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)}>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
            {s === status ? " (current)" : ""}
          </option>
        ))}
      </select>
      <FieldError name="status" />
      <label className="mt-3 flex items-center gap-2 text-[14px] text-ink">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-[#0f4526]" />
        Email the customer about the new status
      </label>
      {cancelling && next !== status && stockReduced && (
        <label className="mt-2 flex items-center gap-2 text-[14px] text-ink">
          <input type="checkbox" name="restock" defaultChecked className="h-4 w-4 accent-[#0f4526]" />
          Put the items back in stock
        </label>
      )}
      {(next === "cancelled" || next === "refunded") && next !== status && paid && (
        <p className="mt-3 rounded border border-[#f0d58c] bg-[#fdf6e3] px-3 py-2 text-[13px] text-[#6b4f00]">
          This order was paid. Changing the status here does <strong>not</strong> return the money. Refund the payment in the Razorpay dashboard (Payments → find the payment id below → Refund).
        </p>
      )}
      {status === "pending_payment" && next !== "pending_payment" && !cancelling && (
        <p className="mt-3 rounded border border-[#f0d58c] bg-[#fdf6e3] px-3 py-2 text-[13px] text-[#6b4f00]">
          No payment was recorded for this order. Only continue if you received the money another way. Stock is not reduced automatically.
        </p>
      )}
      <div className="mt-4">
        <SubmitButton className="btn btn-primary w-full">Update status</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function TrackingForm({ orderId, courier, trackingNumber, trackingUrl }: { orderId: number; courier: string | null; trackingNumber: string | null; trackingUrl: string | null }) {
  return (
    <ActionForm action={addTrackingAction} aria-label="Add tracking">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-3">
        <div>
          <label htmlFor="courier" className="label">
            Courier <span className="req">*</span>
          </label>
          <input id="courier" name="courier" className="field" defaultValue={courier ?? ""} placeholder="e.g. Delhivery" maxLength={80} />
          <FieldError name="courier" />
        </div>
        <div>
          <label htmlFor="trackingNumber" className="label">
            Tracking number <span className="req">*</span>
          </label>
          <input id="trackingNumber" name="trackingNumber" className="field" defaultValue={trackingNumber ?? ""} maxLength={80} />
          <FieldError name="trackingNumber" />
        </div>
        <div>
          <label htmlFor="trackingUrl" className="label">
            Tracking link
          </label>
          <input id="trackingUrl" name="trackingUrl" type="url" inputMode="url" className="field" defaultValue={trackingUrl ?? ""} placeholder="https://" maxLength={300} />
          <FieldError name="trackingUrl" />
        </div>
        <label className="flex items-center gap-2 text-[14px] text-ink">
          <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-[#0f4526]" />
          Email the tracking details to the customer
        </label>
        <p className="text-[13px] text-muted">Saving sets the order to Shipped.</p>
        <SubmitButton className="btn btn-primary w-full">Save tracking</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function NoteForm({ orderId }: { orderId: number }) {
  const [kind, setKind] = useState<"note" | "customer_note">("note");
  return (
    <ActionForm action={addOrderNoteAction} resetOnSuccess aria-label="Add note">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="message" className="label">
        Note
      </label>
      <textarea id="message" name="message" rows={3} className="field" maxLength={2000} />
      <FieldError name="message" />
      <fieldset className="mt-3">
        <legend className="sr-only">Who can see the note</legend>
        <label className="mr-4 inline-flex items-center gap-2 text-[14px] text-ink">
          <input type="radio" name="kind" value="note" checked={kind === "note"} onChange={() => setKind("note")} className="accent-[#0f4526]" />
          Private (staff only)
        </label>
        <label className="inline-flex items-center gap-2 text-[14px] text-ink">
          <input type="radio" name="kind" value="customer_note" checked={kind === "customer_note"} onChange={() => setKind("customer_note")} className="accent-[#0f4526]" />
          Note to customer
        </label>
      </fieldset>
      {kind === "customer_note" && (
        <label className="mt-2 flex items-center gap-2 text-[14px] text-ink">
          <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-[#0f4526]" />
          Also email the note to the customer
        </label>
      )}
      <div className="mt-3">
        <SubmitButton className="btn btn-outline w-full">Add note</SubmitButton>
      </div>
    </ActionForm>
  );
}
