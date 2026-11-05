/**
 * Checkout form rules (pure functions, safe to use in the browser AND on the server).
 * The browser uses them for instant feedback; the API runs them again after the zod shape check,
 * so the server never trusts what the browser says.
 */
import { INDIAN_STATES, normalizeIndianPhone, PINCODE_RE } from "@/lib/india";
import type { AddressInput, CheckoutInput, FieldErrors } from "./types";

/** Same shape as OrderAddress in the database schema. */
export type NormalizedAddress = {
  fullName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FIELD_LIMITS = { fullName: 120, company: 120, address1: 200, address2: 200, city: 100, postcode: 12, phone: 40, email: 190, orderNotes: 1000 } as const;

export const emptyAddress = (): AddressInput => ({ fullName: "", company: "", address1: "", address2: "", city: "", state: "", postcode: "", phone: "", email: "" });

/** Trims and collapses spaces (also removes control characters that could break emails/labels). */
export function cleanText(value: string | null | undefined, max = 200): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** PIN code without spaces ("110 027" -> "110027"). */
export function cleanPostcode(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, "").slice(0, FIELD_LIMITS.postcode);
}

export function isValidState(code: string): boolean {
  return INDIAN_STATES.some((s) => s.code === code);
}

/**
 * Turns a typed address into the stored form: trimmed text, upper-case state code,
 * PIN without spaces, phone as 10 digits, lower-case email, country "IN". Empty optional fields are dropped.
 */
export function normalizeAddress(a: Partial<AddressInput>, opts: { withContact?: boolean } = {}): NormalizedAddress {
  const out: NormalizedAddress = {
    fullName: cleanText(a.fullName, FIELD_LIMITS.fullName),
    address1: cleanText(a.address1, FIELD_LIMITS.address1),
    city: cleanText(a.city, FIELD_LIMITS.city),
    state: cleanText(a.state, 8).toUpperCase(),
    postcode: cleanPostcode(a.postcode),
    country: "IN",
  };
  const company = cleanText(a.company, FIELD_LIMITS.company);
  const address2 = cleanText(a.address2, FIELD_LIMITS.address2);
  if (company) out.company = company;
  if (address2) out.address2 = address2;
  if (opts.withContact) {
    const rawPhone = cleanText(a.phone, FIELD_LIMITS.phone);
    const phone = normalizeIndianPhone(rawPhone) ?? rawPhone;
    const email = cleanText(a.email, FIELD_LIMITS.email).toLowerCase();
    if (phone) out.phone = phone;
    if (email) out.email = email;
  }
  return out;
}

function checkAddress(prefix: "billing" | "shipping", a: AddressInput, withContact: boolean, errors: FieldErrors) {
  const label = prefix === "billing" ? "Billing" : "Shipping";
  if (!cleanText(a.fullName)) errors[`${prefix}.fullName`] = `${label} Full Name is a required field.`;
  if (!cleanText(a.address1)) errors[`${prefix}.address1`] = `${label} Street address is a required field.`;
  if (!cleanText(a.city)) errors[`${prefix}.city`] = `${label} Town / City is a required field.`;
  if (!a.state) errors[`${prefix}.state`] = `${label} State is a required field.`;
  else if (!isValidState(a.state)) errors[`${prefix}.state`] = `${label} State is not valid. Please choose a state from the list.`;
  const pin = cleanPostcode(a.postcode);
  if (!pin) errors[`${prefix}.postcode`] = `${label} PIN Code is a required field.`;
  else if (!PINCODE_RE.test(pin)) errors[`${prefix}.postcode`] = `${label} PIN Code is not a valid postcode / ZIP.`;
  if (withContact) {
    const phone = cleanText(a.phone);
    if (!phone) errors[`${prefix}.phone`] = `${label} Phone is a required field.`;
    else if (!normalizeIndianPhone(phone)) errors[`${prefix}.phone`] = `${label} Phone is not a valid phone number.`;
    const email = cleanText(a.email);
    if (!email) errors[`${prefix}.email`] = `${label} Email Address is a required field.`;
    else if (!EMAIL_RE.test(email) || email.length > FIELD_LIMITS.email) errors[`${prefix}.email`] = `${label} Email Address is not a valid email address.`;
  }
}

/** Business rules of the checkout form. Returns field errors (empty object = valid). */
export function validateCheckoutFields(input: Pick<CheckoutInput, "billing" | "shipToDifferent" | "shipping" | "orderNotes">): FieldErrors {
  const errors: FieldErrors = {};
  checkAddress("billing", input.billing, true, errors);
  if (input.shipToDifferent) checkAddress("shipping", input.shipping, false, errors);
  if ((input.orderNotes ?? "").length > FIELD_LIMITS.orderNotes) errors.orderNotes = `Order notes can be at most ${FIELD_LIMITS.orderNotes} characters.`;
  return errors;
}

/** The address shipping is calculated for (billing unless "Ship to a different address?" is ticked). */
export function shippingDestination(input: Pick<CheckoutInput, "billing" | "shipToDifferent" | "shipping">): { state: string; postcode: string } {
  const a = input.shipToDifferent ? input.shipping : input.billing;
  return { state: (a.state || "").toUpperCase(), postcode: cleanPostcode(a.postcode) };
}

/** True when a destination is complete enough to ask the server for shipping costs. */
export function isCompleteDestination(d: { state: string; postcode: string }): boolean {
  return isValidState(d.state) && PINCODE_RE.test(d.postcode);
}
