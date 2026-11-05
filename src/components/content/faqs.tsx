/**
 * FAQ data for /faq/ and /contact-us/.
 *
 * The answers come from src/content/faqs.json (the real FAQ text saved before the old page was
 * hacked). A few answers are corrected here so the page never contradicts the rest of the site:
 *  - "contact": the saved answer gave an old Rajouri Garden address; the site address is SITE.address.
 *  - "payment-cod": the saved answer was a note written for the chatbot ("the pages we verified do
 *    not list…"), not text for customers. It now describes how this shop actually takes payment
 *    (online through Razorpay everywhere; cash on delivery in Delhi NCR, like the old checkout).
 *  - "privacy": points to this shop's own Privacy Policy page.
 * Plain URLs, emails and phone numbers in answers become real links (FaqAnswer).
 */
import Link from "next/link";
import faqsJson from "@/content/faqs.json";
import { routes } from "@/lib/routes";
import { SITE } from "@/lib/site";

export type Faq = { id: string; q: string; a: string };

const OVERRIDES: Record<string, string> = {
  contact: `Email ${SITE.email} (customer service). You can also call the toll-free number ${SITE.tollFree}, or ${SITE.phone} for purchase and order-tracking related queries. Our address is ${SITE.address}.`,
  "payment-cod": `You can pay online at checkout through Razorpay's secure payment page, which accepts UPI, debit and credit cards (Visa, Mastercard, RuPay) and net banking. Cash on delivery is available for Delhi NCR addresses: choose "Cash on delivery" at checkout. For any payment question, email ${SITE.email}.`,
  privacy: `Jivo does not sell, rent or trade your personal information to third parties. Data sent to the website uses encryption. If you gave your phone or email you may get messages about new programs or offers; to opt out, email ${SITE.email}. Full policy: https://shop.jivo.in/privacy-policy/`,
};

export const FAQS: Faq[] = (faqsJson as Faq[]).map((f) => ({ ...f, a: OVERRIDES[f.id] ?? f.a }));

/* ---------------- linkify ---------------- */

// URLs, email addresses and the two phone numbers used in the answers.
const TOKEN_RE = /(https?:\/\/[^\s]+[^\s.,;:)])|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(1800 137 4433|\+91 8595 349 565)/gi;

/** Links to the old live shop (or jivo.in policy) become links to our own pages. */
function internalPath(url: string): { href: string; label: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname === "www.jivo.in" && u.pathname.startsWith("/privacy-policy")) return { href: routes.privacy, label: "Privacy Policy" };
    if (u.hostname !== "shop.jivo.in") return null;
    const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
    const labels: Record<string, string> = {
      "/": "shop.jivo.in",
      [routes.trackOrder]: "Track Order page",
      [routes.checkout]: "checkout page",
      [routes.privacy]: "Privacy Policy",
    };
    return { href: path, label: labels[path] ?? `shop.jivo.in${path}` };
  } catch {
    return null;
  }
}

const linkClass = "font-semibold text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark";

/** Renders one FAQ answer as text with working links. */
export function FaqAnswer({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    const [token, url, email, phone] = m;
    if (url) {
      const internal = internalPath(url);
      parts.push(
        internal ? (
          <Link key={i} href={internal.href} className={linkClass}>
            {internal.label}
          </Link>
        ) : (
          <a key={i} href={url} className={linkClass} target="_blank" rel="noopener noreferrer">
            {url.replace(/^https?:\/\//, "")}
          </a>
        ),
      );
    } else if (email) {
      parts.push(
        <a key={i} href={`mailto:${email}`} className={linkClass}>
          {email}
        </a>,
      );
    } else if (phone) {
      parts.push(
        <a key={i} href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={`${linkClass} whitespace-nowrap`}>
          {phone}
        </a>,
      );
    }
    last = i + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
