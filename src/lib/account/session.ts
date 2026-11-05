/**
 * Login guard for account pages: sends logged-out visitors to /my-account/?redirect=<this page>
 * so they come back here after logging in.
 */
import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

/** ?redirect= value to put in the login form (only same-site paths; the login action checks it again). */
export function redirectParam(value: string | string[] | undefined): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !/[\x00-\x1f\x7f\\]/.test(v) && v.length < 500 ? v : "";
}

export async function requireAccountUser(returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`${routes.account}?redirect=${encodeURIComponent(returnTo)}`);
  return user;
}
