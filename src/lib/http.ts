/** Small helpers for route handlers (JSON responses, origin checks, client IP). */
import { headers } from "next/headers";
import type { z } from "zod";

export function json<T>(data: T, init?: number | ResponseInit): Response {
  const base: ResponseInit = typeof init === "number" ? { status: init } : init || {};
  return Response.json(data, { ...base, headers: { "Cache-Control": "no-store", ...(base.headers || {}) } });
}

export function errorJson(error: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ ok: false, error, ...extra }, status);
}

/**
 * Blocks cross-site requests to state-changing endpoints (basic CSRF protection on top of
 * SameSite=Lax cookies). Returns an error Response, or null when the request is allowed.
 */
export function rejectCrossSite(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin) {
    // Same-origin fetch() always sends Origin for POST/PUT/PATCH/DELETE in modern browsers.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return errorJson("Cross-site request blocked.", 403);
    return null;
  }
  try {
    if (new URL(origin).host !== host) return errorJson("Cross-site request blocked.", 403);
  } catch {
    return errorJson("Bad origin.", 403);
  }
  return null;
}

/** Parses and validates a JSON body with a zod schema. */
export async function readJson<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: errorJson("Invalid JSON body.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, response: errorJson(first?.message || "Invalid request.") };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Client IP for rate limits and login lockout. Visitors can send any of these headers themselves,
 * so only ONE header is trusted: the one the hosting platform overwrites.
 *   TRUSTED_IP_HEADER=cf-connecting-ip   behind Cloudflare
 *   TRUSTED_IP_HEADER=x-real-ip          behind your own Nginx that sets it
 *   (not set) on Vercel                  x-vercel-forwarded-for
 *   (not set) elsewhere                  first x-forwarded-for entry (set TRUSTED_IP_HEADER in production!)
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const name = (process.env.TRUSTED_IP_HEADER || (process.env.VERCEL ? "x-vercel-forwarded-for" : "x-forwarded-for")).toLowerCase();
  const ip = h.get(name)?.split(",")[0] || "unknown";
  return ip.trim().slice(0, 64); // fits the database column
}
