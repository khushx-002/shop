/**
 * Admin access checks (server only).
 * - Pages call requireAdminPage(): logged out -> login page, not an admin -> 404.
 *   (The admin layout shows a proper 403 page on a full page load; this is the second guard
 *   for client-side navigation, where the layout is not run again.)
 * - Server actions wrap their body in adminAction(): it calls requireAdmin() itself every time.
 */
import "server-only";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { getSessionUser, requireAdmin, type SessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import { fail, type FormState } from "./form";

export const ADMIN_LOGIN_URL = `${routes.account}?redirect=${routes.admin}`; // "/my-account/?redirect=/admin/"

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(ADMIN_LOGIN_URL);
  if (user.role !== "admin") notFound();
  return user;
}

/** Name used in the order timeline ("admin:Jane"). */
export function actorName(user: SessionUser): string {
  return `admin:${(user.name || user.email).slice(0, 70)}`;
}

/**
 * Runs an admin server action: checks the admin session first, turns unexpected errors into
 * a friendly message (details go to the server log only).
 */
export async function adminAction(fn: (admin: SessionUser) => Promise<FormState>): Promise<FormState> {
  let admin: SessionUser;
  try {
    admin = await requireAdmin();
  } catch {
    return fail("Your admin session has ended. Please log in again.");
  }
  try {
    return await fn(admin);
  } catch (err) {
    unstable_rethrow(err); // redirect()/notFound() inside an action must keep working
    console.error("[admin] action failed:", err);
    return fail("Something went wrong while saving. Please try again.");
  }
}
