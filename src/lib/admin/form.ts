/**
 * Small helpers for admin forms (used by the server actions).
 * No server-only imports here, so client components can import the FormState type.
 */
import { z } from "zod";

/** What every admin server action returns (shown by <ActionForm>). */
export type FormState = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every successful submit, so the form can reset itself when asked. */
  stamp?: number;
} | null;

export const ok = (message: string): FormState => ({ ok: true, message, stamp: Date.now() });
export const fail = (error: string, fieldErrors?: Record<string, string>): FormState => ({ ok: false, error, fieldErrors });

/** Reads a FormData into a plain object of strings (checkboxes become "on"). Multi-value fields use `all`. */
export function formObject(formData: FormData, multi: string[] = []): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (multi.includes(key)) {
      const list = (out[key] as string[] | undefined) ?? [];
      list.push(value);
      out[key] = list;
    } else {
      out[key] = value;
    }
  }
  for (const key of multi) out[key] ??= [];
  return out;
}

/** Runs a zod schema and turns its issues into a FormState with field errors. */
export function parseForm<S extends z.ZodTypeAny>(schema: S, raw: unknown): { ok: true; data: z.infer<S> } | { ok: false; state: FormState } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "_"); // first segment: "pincodePrefixes.2" -> "pincodePrefixes"
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, state: fail("Please fix the highlighted fields.", fieldErrors) };
}

/* ---------------- field types ---------------- */

/** HTML checkbox: present ("on") = true, missing = false. */
export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

/** Trimmed text, empty string becomes null. */
export const optionalText = (max: number, label = "This field") =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`))
    .transform((v) => (v === "" ? null : v));

export const requiredText = (max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);

const RUPEES_RE = /^\d{1,8}(\.\d{1,2})?$/;

/** Rupee amount typed by the admin ("1899" or "1899.50") -> integer paise. */
export const rupeesRequired = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .transform((s) => s.replace(/[₹,\s]/g, ""))
    .pipe(z.string().regex(RUPEES_RE, `${label}: enter an amount in rupees, e.g. 499 or 499.50.`))
    .transform((s) => Math.round(Number(s) * 100));

/** Same as rupeesRequired but an empty box means "no value" (null). */
export const rupeesOptional = (label: string) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(/[₹,\s]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(RUPEES_RE, `${label}: enter an amount in rupees, e.g. 499 or 499.50.`)]))
    .transform((s) => (s === "" ? null : Math.round(Number(s) * 100)));

/** Whole number (stock, limits). Empty -> null. */
export const optionalInt = (label: string, min = 0, max = 1_000_000) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim())
    .pipe(z.union([z.literal(""), z.string().regex(/^-?\d+$/, `${label} must be a whole number.`)]))
    .transform((s) => (s === "" ? null : Number(s)))
    .pipe(
      z
        .number()
        .min(min, `${label} must be at least ${min}.`)
        .max(max, `${label} must be at most ${max}.`)
        .nullable(),
    );

export const idField = z.coerce.number().int().positive();

/** Paise -> "1899.50" for an input box (no ₹, no thousands separator). */
export function paiseToInput(paise: number | null | undefined): string {
  if (paise == null) return "";
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}
