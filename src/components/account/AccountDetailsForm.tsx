"use client";
/**
 * /my-account/edit-account/ form: full name, email and an optional password change
 * (WooCommerce "Account details"). Saved by updateAccountAction.
 */
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Notice } from "@/components/checkout/Notice";
import { updateAccountAction } from "@/lib/account/actions";
import { PasswordInput } from "./PasswordInput";
import { BTN_DARK, FIELD_ERROR, INPUT, LABEL } from "./form-styles";

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? (
    <span id={`${id}-error`} className={FIELD_ERROR}>
      {text}
    </span>
  ) : null;
}

export function AccountDetailsForm({ initialName, initialEmail, hasPassword }: { initialName: string; initialEmail: string; hasPassword: boolean }) {
  const [state, action, pending] = useActionState(updateAccountAction, null);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const id = useId();
  const { refresh } = useCart();
  // The header shows the customer's name: reload it after a successful save.
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.ok) void refresh();
    // The message is above the form: bring it into view after saving.
    if (state) noticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state, refresh]);
  const fe = state?.fieldErrors ?? {};
  const label = LABEL.replace("text-body", "text-ink");
  return (
    <form action={action} noValidate className="max-w-[640px]">
      <div ref={noticeRef} aria-live="polite" className="scroll-mt-[100px]">
        {state?.ok && state.message && (
          <Notice kind="success" className="mb-[24px]">
            {state.message}
          </Notice>
        )}
        {state && !state.ok && state.error && (
          <Notice kind="error" className="mb-[24px]">
            {state.error}
          </Notice>
        )}
      </div>

      <p className="mb-[20px]">
        <label htmlFor={`${id}-name`} className={label}>
          Full name&nbsp;<span aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-name`}
          name="account_name"
          type="text"
          required
          autoComplete="name"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={fe.account_name ? true : undefined}
          aria-describedby={fe.account_name ? `${id}-name-error` : undefined}
          className={INPUT}
        />
        <FieldError id={`${id}-name`} text={fe.account_name} />
      </p>
      <p className="mb-[30px]">
        <label htmlFor={`${id}-email`} className={label}>
          Email address&nbsp;<span aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-email`}
          name="account_email"
          type="email"
          required
          autoComplete="email"
          maxLength={190}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={fe.account_email ? true : undefined}
          aria-describedby={fe.account_email ? `${id}-email-error` : undefined}
          className={INPUT}
        />
        <FieldError id={`${id}-email`} text={fe.account_email} />
      </p>

      <fieldset className="mb-[24px] rounded-[16px] border border-line bg-cream-light px-[18px] pb-[4px] pt-[8px] md:px-[24px]">
        <legend className="px-[8px] font-heading text-[20px] font-bold text-primary">Password change</legend>
        {!hasPassword && (
          <p className="mb-[16px] mt-[8px] text-[14px]">
            Your account does not have a password yet. Use the link in your welcome email (or “Lost your password?”) to set one.
          </p>
        )}
        <p className="mb-[20px]">
          <label htmlFor={`${id}-current`} className={label}>
            Current password (leave blank to leave unchanged)
          </label>
          <PasswordInput id={`${id}-current`} name="password_current" autoComplete="current-password" error={fe.password_current} />
          <FieldError id={`${id}-current`} text={fe.password_current} />
        </p>
        <p className="mb-[20px]">
          <label htmlFor={`${id}-p1`} className={label}>
            New password (leave blank to leave unchanged)
          </label>
          <PasswordInput id={`${id}-p1`} name="password_1" autoComplete="new-password" error={fe.password_1} describedBy={`${id}-hint`} />
          <FieldError id={`${id}-p1`} text={fe.password_1} />
          <span id={`${id}-hint`} className="mt-[6px] block text-[13px] text-muted">
            At least 8 characters, with at least one letter and one number.
          </span>
        </p>
        <p className="mb-[20px]">
          <label htmlFor={`${id}-p2`} className={label}>
            Confirm new password
          </label>
          <PasswordInput id={`${id}-p2`} name="password_2" autoComplete="new-password" error={fe.password_2} />
          <FieldError id={`${id}-p2`} text={fe.password_2} />
        </p>
      </fieldset>

      <p className="mb-[20px] text-[14px] text-muted">To change your email address or password, enter your current password.</p>
      <button type="submit" disabled={pending} aria-busy={pending} className={`${BTN_DARK} min-[480px]:w-auto min-[480px]:px-[40px]`}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
