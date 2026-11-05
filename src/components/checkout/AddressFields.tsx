"use client";
/**
 * Billing / shipping address fields of the checkout form (same labels, order and placeholders as
 * the old WooCommerce checkout). Errors are shown under each field and linked with aria-describedby.
 * Heritage look: `.field` inputs (9px corners, warm grey border, green focus ring) and `.label` labels.
 */
import { INDIAN_STATES } from "@/lib/india";
import type { AddressInput, FieldErrors } from "@/lib/checkout/types";

type Props = {
  prefix: "billing" | "shipping";
  value: AddressInput;
  errors: FieldErrors;
  onChange: (field: keyof AddressInput, value: string) => void;
  onBlur: (field: keyof AddressInput) => void;
  withContact: boolean;
};

const input = "field leading-[1.4] placeholder:text-muted";

function Row({ id, label, required, error, children, srOnlyLabel = false }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode; srOnlyLabel?: boolean }) {
  return (
    <p className="mb-[18px]">
      <label htmlFor={id} className={srOnlyLabel ? "sr-only" : "label"}>
        {label}
        {required ? (
          <>
            {" "}
            <abbr title="required" className="text-danger no-underline">
              *
            </abbr>
          </>
        ) : (
          <span className="font-normal text-muted"> (optional)</span>
        )}
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} className="mt-[6px] block text-[13px] text-danger">
          {error}
        </span>
      )}
    </p>
  );
}

export function AddressFields({ prefix, value, errors, onChange, onBlur, withContact }: Props) {
  const id = (f: string) => `${prefix}_${f}`;
  const err = (f: keyof AddressInput) => errors[`${prefix}.${f}`];
  const common = (f: keyof AddressInput) => ({
    id: id(f),
    name: `${prefix}_${f}`,
    value: value[f],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange(f, e.target.value),
    onBlur: () => onBlur(f),
    "aria-invalid": err(f) ? true : undefined,
    "aria-describedby": err(f) ? `${id(f)}-error` : undefined,
  });
  const ac = (token: string) => `${prefix} ${token}`;

  return (
    <div>
      <Row id={id("fullName")} label="Full Name" required error={err("fullName")}>
        <input {...common("fullName")} type="text" autoComplete={ac("name")} maxLength={120} required className={input} />
      </Row>
      <Row id={id("company")} label="Company Name" error={err("company")}>
        <input {...common("company")} type="text" autoComplete={ac("organization")} maxLength={120} placeholder="Company Name" className={input} />
      </Row>
      <div className="mb-[18px] text-ink">
        <p className="label">
          Country / Region{" "}
          <abbr title="required" className="text-danger no-underline">
            *
          </abbr>
        </p>
        <strong className="block rounded-[9px] border border-line bg-cream-light px-[14px] py-[11px] text-[15px] font-semibold">India</strong>
      </div>
      <Row id={id("address1")} label="Street address" required error={err("address1")}>
        <input {...common("address1")} type="text" autoComplete={ac("address-line1")} maxLength={200} placeholder="House number and street name" required className={input} />
      </Row>
      <Row id={id("address2")} label="Apartment, suite, unit, etc." error={err("address2")} srOnlyLabel>
        <input {...common("address2")} type="text" autoComplete={ac("address-line2")} maxLength={200} placeholder="Apartment, suite, unit, etc. (optional)" className={`${input} -mt-[3px]`} />
      </Row>
      <Row id={id("city")} label="Town / City" required error={err("city")}>
        <input {...common("city")} type="text" autoComplete={ac("address-level2")} maxLength={100} required className={input} />
      </Row>
      <Row id={id("state")} label="State" required error={err("state")}>
        <span className="relative block">
          <select {...common("state")} autoComplete={ac("address-level1")} required className={`${input} appearance-none pr-[40px] ${value.state ? "" : "text-muted"}`}>
            <option value="">Select an option…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code} className="text-ink">
                {s.name}
              </option>
            ))}
          </select>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-[14px] top-1/2 size-[14px] -translate-y-1/2 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </Row>
      {withContact && (
        <Row id={id("phone")} label="Phone" required error={err("phone")}>
          <input {...common("phone")} type="tel" autoComplete={ac("tel")} maxLength={20} placeholder="Phone" required className={input} />
        </Row>
      )}
      <Row id={id("postcode")} label="PIN Code" required error={err("postcode")}>
        <input {...common("postcode")} type="text" inputMode="numeric" autoComplete={ac("postal-code")} maxLength={7} required className={input} />
      </Row>
      {withContact && (
        <Row id={id("email")} label="Email Address" required error={err("email")}>
          <input {...common("email")} type="email" autoComplete={ac("email")} maxLength={190} placeholder="Email Address" required className={input} />
        </Row>
      )}
    </div>
  );
}
