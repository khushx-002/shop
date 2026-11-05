/**
 * POST /api/contact/  { name, email, phone?, subject?, message, website }  – Contact Us form.
 *
 * 1. Cross-site requests are refused.
 * 2. The body is validated with zod. Errors come back per field:
 *    { ok: false, error, fieldErrors: { email: "..." } }  (status 400)
 * 3. Max 5 messages per IP per 10 minutes (checked after validation, so fixing a typo does
 *    not use up an attempt).
 * 4. `website` is a honeypot: people never see it, bots fill it in. A filled honeypot gets the
 *    normal success answer (bots learn nothing) but nothing is saved or emailed.
 * 5. The message is saved in contact_messages (visible to admins) and emailed to the admin with
 *    Reply-To set to the customer, so the team can answer straight from their inbox.
 */
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { sendMail, adminEmail } from "@/lib/email";
import { contactMessageEmail } from "@/lib/email-templates";
import { clientIp, errorJson, json, rejectCrossSite } from "@/lib/http";
import { normalizeIndianPhone } from "@/lib/india";
import { rateLimit } from "@/lib/rate-limit";

const REQUIRED = "Please fill out this field.";

const bodySchema = z.object({
  name: z.string().trim().min(1, REQUIRED).max(120, "Please use 120 characters or fewer."),
  email: z.string().trim().toLowerCase().min(1, REQUIRED).max(190, "The e-mail address entered is invalid.").email("The e-mail address entered is invalid."),
  phone: z
    .string()
    .trim()
    .max(40, "The telephone number is invalid.")
    .optional()
    .default("")
    .refine((v) => v === "" || normalizeIndianPhone(v) !== null, "The telephone number is invalid. Please enter a 10-digit mobile number."),
  subject: z.string().trim().max(200, "Please use 200 characters or fewer.").optional().default(""),
  message: z.string().trim().min(1, REQUIRED).max(5000, "Please keep your message under 5,000 characters."),
  website: z.string().max(200).optional().default(""),
});

export type ContactField = "name" | "email" | "phone" | "subject" | "message";

const SUCCESS = { ok: true, message: "Thank you for your message. It has been sent." } as const;

export async function POST(request: Request) {
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorJson("Invalid request.");
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && key !== "website" && !(key in fieldErrors)) fieldErrors[key as ContactField] = issue.message;
    }
    return errorJson("One or more fields have an error. Please check and try again.", 400, { fieldErrors });
  }

  const rl = rateLimit(`contact:${await clientIp()}`, 5, 10 * 60_000);
  if (!rl.ok) {
    return errorJson(`Too many messages from your connection. Please try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s), or email us directly.`, 429, { retryAfter: rl.retryAfterSec });
  }

  const { name, email, phone, subject, message, website } = parsed.data;
  if (website) return json(SUCCESS);

  const record = { name, email, phone: phone ? normalizeIndianPhone(phone) : null, subject: subject || null, message };
  try {
    const db = await getDb();
    await db.insert(schema.contactMessages).values(record);
  } catch (err) {
    console.error("[contact] could not save message", err);
    return errorJson("There was an error trying to send your message. Please try again later.", 500);
  }

  // The message is stored, so a failed email does not lose it; admins also see it in the admin area.
  const mail = contactMessageEmail(record);
  const sent = await sendMail({ to: adminEmail(), replyTo: email, subject: mail.subject, html: mail.html });
  if (!sent.ok) console.error("[contact] admin email failed:", sent.error);

  return json(SUCCESS);
}
