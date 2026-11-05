"use server";
/**
 * Login, registration, logout and password reset (Server Actions).
 * Use with React's useActionState:  const [state, action, pending] = useActionState(loginAction, null)
 * Every action returns an AuthState; on success it may redirect.
 *
 * Behaviour copied from WooCommerce: registration asks only for an email, logs the customer in,
 * and emails a link to set the password.
 */
import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import { consumeToken, createToken, findValidToken } from "@/lib/auth/tokens";
import { mergeCartsAfterLogin } from "@/lib/cart";
import { sendMail } from "@/lib/email";
import { accountCreatedEmail, passwordResetEmail } from "@/lib/email-templates";
import { clientIp } from "@/lib/http";
import { routes } from "@/lib/routes";

export type AuthState = { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> } | null;

const emailSchema = z.string().trim().toLowerCase().email("Please provide a valid email address.").max(190);

let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("timing-equaliser-not-a-real-password");
  return dummyHashPromise;
}

/** Only allow redirects to paths on this site. */
function safeRedirect(target: FormDataEntryValue | null, fallback: string): string {
  const t = typeof target === "string" ? target : "";
  // Browsers drop tabs/newlines in URLs ("/<tab>/evil.com" becomes "//evil.com"), so reject control chars and backslashes.
  if (!t.startsWith("/") || /[\x00-\x1f\x7f\\]/.test(t)) return fallback;
  try {
    const u = new URL(t, "http://x.invalid");
    return u.origin === "http://x.invalid" ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}

async function tooManyFailures(email: string, ip: string): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - 15 * 60_000);
  const [byEmail] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, email), eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  const [byEmailAnyIp] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, email), eq(schema.loginAttempts.success, false), sql`${schema.loginAttempts.ip} not like 'reset:%' and ${schema.loginAttempts.ip} not like 'register:%'`, gt(schema.loginAttempts.createdAt, since)));
  const [byIp] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  // 5 wrong passwords for one email from one IP, 20 for one email from anywhere, or 20 failures from one IP.
  return Number(byEmail?.n ?? 0) >= 5 || Number(byEmailAnyIp?.n ?? 0) >= 20 || Number(byIp?.n ?? 0) >= 20;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase().slice(0, 190);
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("rememberme") === "forever" || formData.get("rememberme") === "on";
  const redirectTo = safeRedirect(formData.get("redirect"), routes.account);
  if (!username) return { ok: false, error: "Error: Username is required.", fieldErrors: { username: "Username is required." } };
  if (!password) return { ok: false, error: "Error: The password field is empty.", fieldErrors: { password: "Password is required." } };

  const db = await getDb();
  const ip = await clientIp();
  if (await tooManyFailures(username, ip)) {
    return { ok: false, error: "Too many failed login attempts. Please wait 15 minutes or reset your password." };
  }
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${username}` });
  // Always run one password check (even for unknown emails / accounts without a password)
  // so the response time does not reveal which emails have an account.
  const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash()), false);
  await db.insert(schema.loginAttempts).values({ email: username, ip, success: valid });
  if (!user || !valid) {
    return { ok: false, error: "Error: The username or password you entered is incorrect. Lost your password?" };
  }
  await createSession(user, remember);
  await mergeCartsAfterLogin(user.id);
  redirect(user.role === "admin" && redirectTo === routes.account ? routes.admin : redirectTo);
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (String(formData.get("website") ?? "")) return { ok: false, error: "Error: Registration failed." }; // honeypot field must stay empty
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "Error: Please provide a valid email address.", fieldErrors: { email: "Please provide a valid email address." } };
  const email = parsed.data;
  const redirectTo = safeRedirect(formData.get("redirect"), routes.account);
  const db = await getDb();
  const regIp = await clientIp();
  const [recentReg] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, `register:${regIp}`.slice(0, 64)), gt(schema.loginAttempts.createdAt, new Date(Date.now() - 60 * 60_000))));
  if (Number(recentReg?.n ?? 0) >= 5) return { ok: false, error: "Too many registrations from your network. Please try again later." };
  await db.insert(schema.loginAttempts).values({ email, ip: `register:${regIp}`.slice(0, 64), success: false });
  const existing = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${email}` });
  if (existing) {
    return { ok: false, error: "Error: An account is already registered with your email address. Please log in.", fieldErrors: { email: "Already registered." } };
  }
  const [user] = await db.insert(schema.users).values({ email, role: "customer" }).returning();
  const token = await createToken(db, user.id, "set_password");
  const mail = accountCreatedEmail(email, routes.resetPassword(token));
  await sendMail({ to: email, subject: mail.subject, html: mail.html });
  await createSession(user, false);
  await mergeCartsAfterLogin(user.id);
  redirect(redirectTo);
}

export async function logoutAction(): Promise<void> {
  // Bumping sessionVersion makes every copy of the login cookie invalid (also a stolen one), on all devices.
  const user = await getSessionUser();
  if (user) {
    const db = await getDb();
    await db.update(schema.users).set({ sessionVersion: sql`${schema.users.sessionVersion} + 1` }).where(eq(schema.users.id, user.id));
  }
  await destroySession();
  redirect(routes.account);
}

export async function lostPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const login = String(formData.get("user_login") ?? "").trim().toLowerCase().slice(0, 190);
  if (!login) return { ok: false, error: "Enter a username or email address.", fieldErrors: { user_login: "Required." } };
  const db = await getDb();
  const ip = await clientIp();
  const since = new Date(Date.now() - 60 * 60_000);
  const [recent] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, `reset:${ip}`), gt(schema.loginAttempts.createdAt, since)));
  if (Number(recent?.n ?? 0) >= 10) return { ok: false, error: "Too many reset requests. Please try again later." };
  const [perEmail] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, login), sql`${schema.loginAttempts.ip} like 'reset:%'`, gt(schema.loginAttempts.createdAt, since)));
  const emailCapped = Number(perEmail?.n ?? 0) >= 3; // at most 3 reset emails per address per hour
  await db.insert(schema.loginAttempts).values({ email: login, ip: `reset:${ip}`.slice(0, 64), success: false });
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.email}) = ${login}` });
  if (user && !emailCapped) {
    const token = await createToken(db, user.id, "reset");
    const mail = passwordResetEmail(user.name, routes.resetPassword(token));
    await sendMail({ to: user.email, subject: mail.subject, html: mail.html });
  }
  // Same answer whether or not the account exists (prevents finding out who is a customer).
  return { ok: true, message: "Password reset email has been sent. If an account exists for that email address, you will receive a link to set a new password." };
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password_1") ?? "");
  const confirm = String(formData.get("password_2") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem, fieldErrors: { password_1: problem } };
  if (password !== confirm) return { ok: false, error: "Passwords do not match.", fieldErrors: { password_2: "Passwords do not match." } };
  const db = await getDb();
  const row = await findValidToken(db, token);
  if (!row) return { ok: false, error: "This password reset link is invalid or has expired. Please request a new one." };
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
  if (!user) return { ok: false, error: "Account not found." };
  const newVersion = user.sessionVersion + 1; // logs out every other device
  if (!(await consumeToken(db, row.id, user.id))) return { ok: false, error: "This password reset link has already been used. Please request a new one." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(password), sessionVersion: newVersion, updatedAt: new Date() }).where(eq(schema.users.id, user.id));
  await createSession({ ...user, sessionVersion: newVersion }, false);
  await mergeCartsAfterLogin(user.id);
  redirect(`${routes.account}?password-reset=true`);
}
