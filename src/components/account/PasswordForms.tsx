"use client";
/**
 * "Lost your password?" form (lostPasswordAction) and the "Enter a new password" form
 * (resetPasswordAction) – same texts as the WooCommerce pages of the old site, in a soft card.
 */
import { useActionState, useId, useState } from "react";
import { Notice } from "@/components/checkout/Notice";
import { lostPasswordAction, resetPasswordAction } from "@/lib/auth/actions";
import { PasswordInput } from "./PasswordInput";
import { BTN_DARK, FIELD_ERROR, INPUT, LABEL } from "./form-styles";

export function LostPasswordForm() {
  const [state, action, pending] = useActionState(lostPasswordAction, null);
  const [login, setLogin] = useState("");
  const id = useId();
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="card-soft mx-auto max-w-[520px] px-[22px] py-[28px] shadow-soft md:px-[36px] md:py-[36px]">
      <div aria-live="polite">
        {state?.ok && state.message && (
          <Notice kind="success" className="mb-[20px]">
            {state.message}
          </Notice>
        )}
        {state && !state.ok && state.error && (
          <Notice kind="error" className="mb-[20px]">
            {state.error}
          </Notice>
        )}
      </div>
      <p className="mb-[20px] text-[15px] leading-[1.6] text-body">
        Lost your password? Please enter your username or email address. You will receive a link to create a new password via email.
      </p>
      <p className="mb-[18px]">
        <label htmlFor={`${id}-login`} className={LABEL}>
          Username or email
        </label>
        <input
          id={`${id}-login`}
          name="user_login"
          type="text"
          required
          autoComplete="username"
          maxLength={190}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          aria-invalid={fe.user_login ? true : undefined}
          aria-describedby={fe.user_login ? `${id}-login-error` : undefined}
          className={INPUT}
        />
        {fe.user_login && (
          <span id={`${id}-login-error`} className={FIELD_ERROR}>
            {fe.user_login}
          </span>
        )}
      </p>
      <button type="submit" disabled={pending} aria-busy={pending} className={BTN_DARK}>
        {pending ? "Sending…" : "Reset password"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const id = useId();
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="card-soft mx-auto max-w-[520px] px-[22px] py-[28px] shadow-soft md:px-[36px] md:py-[36px]">
      <div aria-live="assertive">
        {state?.error && (
          <Notice kind="error" className="mb-[20px]">
            {state.error}
          </Notice>
        )}
      </div>
      <input type="hidden" name="token" value={token} />
      <p className="mb-[20px] text-[15px] leading-[1.6] text-body">Enter a new password below. Use at least 8 characters with at least one letter and one number.</p>
      <p className="mb-[18px]">
        <label htmlFor={`${id}-p1`} className={LABEL}>
          New password&nbsp;<span aria-hidden="true">*</span>
        </label>
        <PasswordInput id={`${id}-p1`} name="password_1" autoComplete="new-password" required error={fe.password_1} />
        {fe.password_1 && (
          <span id={`${id}-p1-error`} className={FIELD_ERROR}>
            {fe.password_1}
          </span>
        )}
      </p>
      <p className="mb-[20px]">
        <label htmlFor={`${id}-p2`} className={LABEL}>
          Re-enter new password&nbsp;<span aria-hidden="true">*</span>
        </label>
        <PasswordInput id={`${id}-p2`} name="password_2" autoComplete="new-password" required error={fe.password_2} />
        {fe.password_2 && (
          <span id={`${id}-p2-error`} className={FIELD_ERROR}>
            {fe.password_2}
          </span>
        )}
      </p>
      <button type="submit" disabled={pending} aria-busy={pending} className={BTN_DARK}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
