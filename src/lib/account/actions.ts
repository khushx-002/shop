"use server";
/**
 * Server actions for the logged-in account area:
 *   saveAddressAction   – /my-account/edit-address/billing|shipping/
 *   updateAccountAction – /my-account/edit-account/ (name, email, password)
 * Use with useActionState. Every action checks the session itself (never trust the browser).
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { createSession, getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { cleanPostcode, cleanText, EMAIL_RE, FIELD_LIMITS, isValidState, normalizeAddress } from "@/lib/checkout/validation";
import type { AddressInput } from "@/lib/checkout/types";
import { normalizeIndianPhone, PINCODE_RE } from "@/lib/india";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/email";
import { esc } from "@/lib/email-templates";
import { routes } from "@/lib/routes";
import { saveDefaultAddress } from "./addresses";

export type AccountFormState = { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> } | null;

const LOGGED_OUT: AccountFormState = { ok: false, error: "Your session has expired. Please log in again." };

/* ------------------------------------------------------------------ */
/* Addresses                                                           */
/* ------------------------------------------------------------------ */

const ADDRESS_FIELDS = ["fullName", "company", "address1", "address2", "city", "state", "postcode", "phone", "email"] as const;

const addressSchema = z.object({
  type: z.enum(["billing", "shipping"]),
  fullName: z.string().max(FIELD_LIMITS.fullName * 2),
  company: z.string().max(FIELD_LIMITS.company * 2),
  address1: z.string().max(FIELD_LIMITS.address1 * 2),
  address2: z.string().max(FIELD_LIMITS.address2 * 2),
  city: z.string().max(FIELD_LIMITS.city * 2),
  state: z.string().max(8),
  postcode: z.string().max(20),
  phone: z.string().max(FIELD_LIMITS.phone),
  email: z.string().max(FIELD_LIMITS.email),
});

/** Same rules and messages as the checkout form. Keys look like "billing.fullName" (what AddressFields expects). */
function addressErrors(type: "billing" | "shipping", a: AddressInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const label = type === "billing" ? "Billing" : "Shipping";
  const key = (f: string) => `${type}.${f}`;
  if (!cleanText(a.fullName)) errors[key("fullName")] = `${label} Full Name is a required field.`;
  if (!cleanText(a.address1)) errors[key("address1")] = `${label} Street address is a required field.`;
  if (!cleanText(a.city)) errors[key("city")] = `${label} Town / City is a required field.`;
  if (!a.state) errors[key("state")] = `${label} State is a required field.`;
  else if (!isValidState(a.state)) errors[key("state")] = `${label} State is not valid. Please choose a state from the list.`;
  const pin = cleanPostcode(a.postcode);
  if (!pin) errors[key("postcode")] = `${label} PIN Code is a required field.`;
  else if (!PINCODE_RE.test(pin)) errors[key("postcode")] = `${label} PIN Code is not a valid postcode / ZIP.`;
  if (type === "billing") {
    const phone = cleanText(a.phone);
    if (!phone) errors[key("phone")] = "Billing Phone is a required field.";
    else if (!normalizeIndianPhone(phone)) errors[key("phone")] = "Billing Phone is not a valid phone number.";
    const email = cleanText(a.email);
    if (!email) errors[key("email")] = "Billing Email Address is a required field.";
    else if (!EMAIL_RE.test(email) || email.length > FIELD_LIMITS.email) errors[key("email")] = "Billing Email Address is not a valid email address.";
  }
  return errors;
}

export async function saveAddressAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await getSessionUser();
  if (!user) return LOGGED_OUT;
  const type = formData.get("type") === "shipping" ? "shipping" : "billing";
  const raw: Record<string, unknown> = { type: formData.get("type") };
  for (const f of ADDRESS_FIELDS) raw[f] = String(formData.get(`${type}_${f}`) ?? "");
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields." };
  const { type: _t, ...input } = parsed.data;
  void _t;
  const fieldErrors = addressErrors(type, input);
  if (Object.keys(fieldErrors).length) return { ok: false, error: Object.values(fieldErrors).join(" "), fieldErrors };

  const a = normalizeAddress(input, { withContact: type === "billing" });
  await saveDefaultAddress(user.id, type, {
    fullName: a.fullName,
    company: a.company ?? null,
    address1: a.address1,
    address2: a.address2 ?? null,
    city: a.city,
    state: a.state,
    postcode: a.postcode,
    country: "IN",
    phone: type === "billing" ? (a.phone ?? null) : null,
    email: type === "billing" ? (a.email ?? null) : null,
  });
  // WooCommerce goes back to the address overview with a notice.
  redirect(`${routes.accountAddresses}?address-updated=${type}`);
}

/* ------------------------------------------------------------------ */
/* Account details                                                     */
/* ------------------------------------------------------------------ */

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Full name is a required field.").max(FIELD_LIMITS.fullName, "Full name is too long."),
  email: z.string().trim().toLowerCase().max(FIELD_LIMITS.email, "Email address is too long.").regex(EMAIL_RE, "Please provide a valid email address."),
  current: z.string().max(200),
  password1: z.string().max(300),
  password2: z.string().max(300),
});

/** Was the current session created with "Remember me"? (keep the same choice when we re-create it) */
async function sessionWasRemembered(): Promise<boolean> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return false;
    const { exp, iat } = decodeJwt(token);
    return !!exp && !!iat && exp - iat > 3 * 86400;
  } catch {
    return false;
  }
}

function emailChangedNotice(name: string | null, newEmail: string) {
  return {
    subject: "Your Jivo Mart email address was changed",
    html: `<p>Hi ${esc(name || "there")},</p><p>The email address of your Jivo Mart account was changed to <strong>${esc(newEmail)}</strong>.</p><p>If you did not make this change, please contact us right away at info@jivo.in.</p>`,
  };
}

export async function updateAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const session = await getSessionUser();
  if (!session) return LOGGED_OUT;
  const parsed = detailsSchema.safeParse({
    name: String(formData.get("account_name") ?? ""),
    email: String(formData.get("account_email") ?? ""),
    current: String(formData.get("password_current") ?? ""),
    password1: String(formData.get("password_1") ?? ""),
    password2: String(formData.get("password_2") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] === "email" ? "account_email" : issue?.path[0] === "name" ? "account_name" : "form";
    return { ok: false, error: issue?.message ?? "Please check the form.", fieldErrors: { [field]: issue?.message ?? "Invalid value." } };
  }
  const { current, password1, password2 } = parsed.data;
  const name = cleanText(parsed.data.name, FIELD_LIMITS.fullName);
  const email = parsed.data.email;

  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.id) });
  if (!user) return LOGGED_OUT;

  const emailChanged = email !== user.email.toLowerCase();
  const passwordChange = password1 !== "" || password2 !== "";

  if (passwordChange) {
    if (!password1) return { ok: false, error: "Please enter your new password.", fieldErrors: { password_1: "Please enter your new password." } };
    const problem = passwordProblem(password1);
    if (problem) return { ok: false, error: problem, fieldErrors: { password_1: problem } };
    if (password1 !== password2) return { ok: false, error: "New passwords do not match.", fieldErrors: { password_2: "New passwords do not match." } };
  }

  // Changing the email or the password needs the current password.
  if (emailChanged || passwordChange) {
    if (!user.passwordHash) {
      // Accounts created at registration/checkout get their first password only through the emailed link.
      return {
        ok: false,
        error: "Your account does not have a password yet. Please set one with the link in your welcome email, or use “Lost your password?” to get a new link, before changing your email or password.",
      };
    }
    if (!current) return { ok: false, error: "Please enter your current password.", fieldErrors: { password_current: "Please enter your current password." } };
    const limit = rateLimit(`account-password:${user.id}`, 5, 15 * 60_000);
    if (!limit.ok) return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
    if (!(await verifyPassword(current, user.passwordHash))) {
      return { ok: false, error: "Your current password is incorrect.", fieldErrors: { password_current: "Your current password is incorrect." } };
    }
  }

  if (emailChanged) {
    const taken = await db.query.users.findFirst({ where: and(sql`lower(${schema.users.email}) = ${email}`, ne(schema.users.id, user.id)), columns: { id: true } });
    if (taken) return { ok: false, error: "This email address is already registered.", fieldErrors: { account_email: "This email address is already registered." } };
  }

  // A new password or email logs out every other device (this one gets a fresh cookie below).
  const newVersion = passwordChange || emailChanged ? user.sessionVersion + 1 : user.sessionVersion;
  try {
    await db
      .update(schema.users)
      .set({
        name,
        email,
        sessionVersion: newVersion,
        ...(passwordChange ? { passwordHash: await hashPassword(password1) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));
  } catch (err) {
    if (/unique|duplicate/i.test(String(err))) return { ok: false, error: "This email address is already registered.", fieldErrors: { account_email: "This email address is already registered." } };
    throw err;
  }

  if (passwordChange) {
    // The version bump logs out every other device; give this browser a fresh session.
    await createSession({ id: user.id, email, name, role: user.role, sessionVersion: newVersion }, await sessionWasRemembered());
  }
  if (emailChanged) {
    const mail = emailChangedNotice(user.name, email);
    await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
  }
  return { ok: true, message: "Account details changed successfully." };
}
