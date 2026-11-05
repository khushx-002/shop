/**
 * Small pure helpers for the product page (safe to use in server and client components).
 */

/** Plain text from simple HTML (for meta descriptions and JSON-LD). */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts text at a word boundary and adds "…". */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trim()}…`;
}

/**
 * Old upload names make poor alt text ("Artboard 1", "Coconut 1L 2"). Use the product name
 * for those, so screen readers hear something meaningful.
 */
export function imageAlt(alt: string | null | undefined, productName: string): string {
  const a = (alt || "").trim();
  if (!a || /^(artboard|img|image|dsc|lifestyle)\b/i.test(a) || /\d$/.test(a) || a.length < 4) return productName;
  return a;
}

/** "October 17, 2024" style date in Indian English (old CusRev format). */
export function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}
