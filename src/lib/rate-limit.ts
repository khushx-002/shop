/**
 * Simple in-memory rate limiter (sliding window) for forms and login.
 * Good for a single server. With several servers, move this to the database or Redis.
 */
type Bucket = { hits: number[] };
const g = globalThis as unknown as { __jivoRate?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__jivoRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key) || { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    const retry = Math.ceil((windowMs - (now - b.hits[0])) / 1000);
    buckets.set(key, b);
    return { ok: false, retryAfterSec: Math.max(1, retry) };
  }
  b.hits.push(now);
  buckets.set(key, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.hits.length || now - v.hits[v.hits.length - 1] > windowMs) buckets.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}
