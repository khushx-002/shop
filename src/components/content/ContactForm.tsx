"use client";
/**
 * Contact form (replaces the broken Contact Form 7 form). Posts JSON to /api/contact/.
 * - Errors are shown under each field (aria-invalid + aria-describedby) and summarised in an
 *   aria-live region; focus moves to the first field with an error.
 * - Success shows the Contact Form 7 wording and clears the form.
 * - "website" is a hidden honeypot field for bots.
 */
import { useId, useRef, useState } from "react";
import { api } from "@/lib/routes";

type Field = "name" | "email" | "phone" | "subject" | "message";
type Status = { kind: "ok" | "error"; text: string } | null;

const ORDER: Field[] = ["name", "email", "phone", "subject", "message"];

/** Same checks as the server, so most mistakes are caught without a round trip. */
function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!values.name.trim()) errors.name = "Please fill out this field.";
  if (!values.email.trim()) errors.email = "Please fill out this field.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "The e-mail address entered is invalid.";
  if (values.phone.trim() && !/^(\+?91[\s-]?|0)?[0-9][0-9\s-]{8,12}$/.test(values.phone.trim())) errors.phone = "The telephone number is invalid. Please enter a 10-digit mobile number.";
  if (!values.message.trim()) errors.message = "Please fill out this field.";
  return errors;
}

export function ContactForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>(null);

  const focusFirstError = (errs: Partial<Record<Field, string>>) => {
    const first = ORDER.find((f) => errs[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const values = Object.fromEntries(ORDER.map((f) => [f, String(data.get(f) ?? "")])) as Record<Field, string>;
    const local = validate(values);
    if (Object.keys(local).length) {
      setErrors(local);
      setStatus({ kind: "error", text: "One or more fields have an error. Please check and try again." });
      focusFirstError(local);
      return;
    }
    setPending(true);
    setErrors({});
    setStatus(null);
    try {
      const res = await fetch(api.contact, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: String(data.get("website") ?? "") }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string; fieldErrors?: Partial<Record<Field, string>> } | null;
      if (res.ok && body?.ok) {
        setStatus({ kind: "ok", text: body.message || "Thank you for your message. It has been sent." });
        form.reset();
      } else {
        const fieldErrors = body?.fieldErrors ?? {};
        setErrors(fieldErrors);
        setStatus({ kind: "error", text: body?.error || "There was an error trying to send your message. Please try again later." });
        focusFirstError(fieldErrors);
      }
    } catch {
      setStatus({ kind: "error", text: "Network error. Please check your connection and try again." });
    } finally {
      setPending(false);
    }
  };

  const fieldProps = (name: Field) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-err` : undefined,
    onChange: () => errors[name] && setErrors((prev) => ({ ...prev, [name]: undefined })),
  });

  const errorText = (name: Field) =>
    errors[name] ? (
      <p id={`${id}-${name}-err`} className="mt-[6px] text-[14px] text-danger">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-[18px]" aria-describedby={`${id}-status`}>
      {/* Honeypot: hidden from people and screen readers; bots fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-[18px] md:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="label">
            Your name <span className="req">*</span>
          </label>
          <input {...fieldProps("name")} type="text" required maxLength={120} autoComplete="name" className="field" />
          {errorText("name")}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="label">
            Your email <span className="req">*</span>
          </label>
          <input {...fieldProps("email")} type="email" required maxLength={190} autoComplete="email" className="field" />
          {errorText("email")}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="label">
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input {...fieldProps("phone")} type="tel" inputMode="tel" maxLength={20} autoComplete="tel" className="field" />
          {errorText("phone")}
        </div>
        <div>
          <label htmlFor={`${id}-subject`} className="label">
            Subject
          </label>
          <input {...fieldProps("subject")} type="text" maxLength={200} className="field" />
          {errorText("subject")}
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="label">
          Your message <span className="req">*</span>
        </label>
        <textarea {...fieldProps("message")} required rows={7} maxLength={5000} className="field resize-y" />
        {errorText("message")}
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary h-[50px] w-full text-[15px] sm:w-auto sm:min-w-[180px]">
        {pending ? "Sending…" : "Send"}
      </button>

      <div
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={
          status
            ? `rounded-[12px] border-l-[4px] px-[16px] py-[12px] text-[15px] leading-[1.5] ${status.kind === "ok" ? "border-primary bg-sage text-primary" : "border-danger bg-[#fdecea] text-[#8e1c1c]"}`
            : "sr-only"
        }
      >
        {status?.text}
      </div>
    </form>
  );
}
