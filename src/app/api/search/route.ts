import { searchSuggestions } from "@/lib/catalog";
import { clientIp, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

/** GET /api/search/?q=canola&category=super-oils – suggestions for the header search popup */
export async function GET(request: Request) {
  const rl = rateLimit(`search:${await clientIp()}`, 60, 60_000);
  if (!rl.ok) return json({ ok: false, error: "Too many searches.", results: [] }, 429);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").slice(0, 80);
  const category = url.searchParams.get("category");
  const results = await searchSuggestions(q, category);
  return json({ ok: true, results }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
