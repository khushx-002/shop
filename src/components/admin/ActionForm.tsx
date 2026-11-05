"use client";
/**
 * Form wrapper for admin server actions (useActionState).
 * - Shows the success / error notice in an aria-live region.
 * - Field errors are read by <FieldError name="..."> and inputs can be marked with <Invalid>.
 * - Submits with onSubmit (not the `action` prop) so React does not clear the typed values
 *   when the server returns a validation error. Pass resetOnSuccess to clear it after success.
 */
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/admin/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const Ctx = createContext<{ state: FormState; pending: boolean }>({ state: null, pending: false });

export function useAdminForm() {
  return useContext(Ctx);
}

export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  compact = false,
  "aria-label": ariaLabel,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** Small inline notice (for buttons inside table rows). */
  compact?: boolean;
  "aria-label"?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const fd = new FormData(e.currentTarget, submitter ?? undefined);
    startTransition(() => dispatch(fd));
  }

  return (
    <Ctx.Provider value={{ state, pending }}>
      <form ref={formRef} onSubmit={onSubmit} className={className} aria-label={ariaLabel} aria-busy={pending} noValidate>
        {!compact && <Notice state={state} />}
        {children}
        {compact && <Notice state={state} compact />}
      </form>
    </Ctx.Provider>
  );
}

function Notice({ state, compact = false }: { state: FormState; compact?: boolean }) {
  const text = state?.ok ? state.message : state?.error;
  return (
    <div role="status" aria-live="polite" className={compact ? "basis-full" : ""}>
      {text ? (
        <p
          className={`${compact ? "mt-1 text-[12px]" : "mb-4 rounded border px-4 py-3 text-[14px]"} ${
            state?.ok ? (compact ? "text-success" : "border-[#b7dfb9] bg-[#edf7ee] text-[#1e5e22]") : compact ? "text-danger" : "border-[#f1b5b5] bg-[#fdecec] text-[#8e1d1d]"
          }`}
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}

/** Error text under one field. */
export function FieldError({ name }: { name: string }) {
  const { state } = useAdminForm();
  const msg = state?.ok === false ? state.fieldErrors?.[name] : undefined;
  if (!msg) return null;
  return (
    <p id={`${name}-error`} className="mt-1 text-[13px] text-danger">
      {msg}
    </p>
  );
}

export function SubmitButton({ children, className = "btn btn-primary", name, value, pendingText = "Saving…" }: { children: ReactNode; className?: string; name?: string; value?: string; pendingText?: string }) {
  const { pending } = useAdminForm();
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Two-step button for destructive actions: first click asks "Are you sure?", the second submits.
 * Esc or "Cancel" goes back; focus moves to the confirm button and back to the opener.
 */
export function ConfirmButton({
  children,
  confirmText = "Yes, delete",
  question = "Are you sure? This cannot be undone.",
  className = "rounded border border-[#e0b4b4] px-3 py-1.5 text-[13px] font-semibold text-danger hover:bg-[#fdecec]",
  name,
  value,
}: {
  children: ReactNode;
  confirmText?: string;
  question?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const [asking, setAsking] = useState(false);
  const { pending, state } = useAdminForm();

  // A new result from the server (success or error) ends the "Are you sure?" step.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setAsking(false);
  }
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
    else if (wasAsking.current) openerRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  if (!asking) {
    return (
      <button ref={openerRef} type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2" role="group" aria-label="Confirm" onKeyDown={(e) => e.key === "Escape" && setAsking(false)}>
      <span className="text-[13px] text-ink">{question}</span>
      <button ref={confirmRef} type="submit" name={name} value={value} disabled={pending} className="rounded bg-danger px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#a31f1f]">
        {pending ? "Working…" : confirmText}
      </button>
      <button type="button" className="rounded border border-line px-3 py-1.5 text-[13px] hover:bg-surface" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}
