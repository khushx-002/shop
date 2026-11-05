"use client";
/**
 * Edit billing / shipping address form. Uses the checkout's AddressFields (same labels and order)
 * and saves through saveAddressAction (validated again on the server).
 */
import { useActionState, useState } from "react";
import { AddressFields } from "@/components/checkout/AddressFields";
import { Notice } from "@/components/checkout/Notice";
import { saveAddressAction } from "@/lib/account/actions";
import type { AddressInput } from "@/lib/checkout/types";
import { BTN_DARK } from "./form-styles";

export function AddressForm({ type, initial }: { type: "billing" | "shipping"; initial: AddressInput }) {
  const [state, action, pending] = useActionState(saveAddressAction, null);
  const [value, setValue] = useState<AddressInput>(initial);
  // Server errors stay until the customer edits that field.
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setCleared({});
  }
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(state?.fieldErrors ?? {})) if (!cleared[k]) errors[k] = v;

  return (
    <form action={action} noValidate>
      <div aria-live="assertive">
        {state?.error && (
          <Notice kind="error" className="mb-[24px]">
            {state.fieldErrors ? (
              <ul>
                {Object.values(state.fieldErrors).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : (
              state.error
            )}
          </Notice>
        )}
      </div>
      <input type="hidden" name="type" value={type} />
      <div className="max-w-[640px]">
        <AddressFields
          prefix={type}
          value={value}
          errors={errors}
          withContact={type === "billing"}
          onChange={(field, v) => {
            setValue((cur) => ({ ...cur, [field]: v }));
            setCleared((c) => ({ ...c, [`${type}.${field}`]: true }));
          }}
          onBlur={() => {}}
        />
        <button type="submit" disabled={pending} aria-busy={pending} className={`${BTN_DARK} mt-[6px] min-[480px]:w-auto min-[480px]:px-[40px]`}>
          {pending ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}
