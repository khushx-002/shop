/**
 * Sends emails through SMTP (nodemailer).
 *
 * - SMTP configured (SMTP_HOST + SMTP_USER + SMTP_PASS): the email is sent.
 * - Not configured in development: the email is written to ./.data/outbox/*.html and the
 *   path is printed, so password links can still be tested locally.
 * - Not configured in production: an error is logged and { ok: false } is returned.
 */
import nodemailer, { type Transporter } from "nodemailer";
import fs from "node:fs";
import path from "node:path";

export type MailInput = { to: string; subject: string; html: string; text?: string; replyTo?: string };
export type MailResult = { ok: boolean; error?: string; outboxFile?: string };

let transporter: Transporter | null = null;

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE ?? "true") !== "false",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h\d|\/tr|\/li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const from = process.env.MAIL_FROM || "Jivo Mart <info@jivo.in>";
  const text = input.text ?? htmlToText(input.html);
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(`[email] SMTP is not configured. Email "${input.subject}" to ${input.to} was NOT sent.`);
      return { ok: false, error: "Email is not configured." };
    }
    const dir = path.join(process.cwd(), ".data", "outbox");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${input.to.replace(/[^a-z0-9@._-]/gi, "_")}.html`);
    fs.writeFileSync(file, `<!-- To: ${input.to} | Subject: ${input.subject} -->\n${input.html}`, "utf8");
    console.info(`[email] (dev) "${input.subject}" to ${input.to} saved to ${file}`);
    return { ok: true, outboxFile: file };
  }
  try {
    await getTransporter().sendMail({ from, to: input.to, subject: input.subject, html: input.html, text, replyTo: input.replyTo });
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Email failed" };
  }
}

/** Admin notification address (new orders, contact messages). */
export function adminEmail(): string {
  return process.env.MAIL_ADMIN || "info@jivo.in";
}
