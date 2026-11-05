/**
 * Session handling: a signed JWT in an httpOnly cookie.
 * - "Remember me" keeps the session for 14 days, otherwise 2 days (same as WooCommerce defaults).
 * - users.session_version lets us log out everywhere (bump the version).
 */
import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const SESSION_COOKIE = "jm_session";
const SHORT_DAYS = 2;
const LONG_DAYS = 14;

/**
 * Key that signs the login cookie. Anyone who knows it can log in as any user (also admin), so a
 * missing, short or example value ("change-me…" from .env.example) stops the app. Only a local
 * `next dev` run may fall back to a dev key.
 */
function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32 || /change-?me/i.test(s)) {
    const localDev = process.env.NODE_ENV === "development" && !process.env.VERCEL && !process.env.CI;
    if (!localDev) throw new Error("AUTH_SECRET must be a random string of at least 32 characters (not the example value).");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = { id: number; email: string; name: string | null; role: "customer" | "admin" };

export async function createSession(user: { id: number; email: string; name: string | null; role: "customer" | "admin"; sessionVersion: number }, remember = false) {
  const days = remember ? LONG_DAYS : SHORT_DAYS;
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role, sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Without "Remember me" the cookie ends when the browser closes (the token itself still expires after 2 days).
    ...(remember ? { maxAge: days * 86400 } : {}),
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

/** Reads the session cookie and checks it against the database (cached per request). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!id) return null;
    const db = await getDb();
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!user || user.sessionVersion !== payload.sv) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
