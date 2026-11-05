/** Site-wide constants (names, URLs, contact) copied from the old site. */
export const SITE = {
  name: "Jivo Mart | Store",
  shortName: "Jivo Mart",
  company: "Jivo Mart Pvt. Ltd.",
  parentCompany: "Jivo Wellness Pvt. Ltd.",
  homeTitle: "Jivo Mart | Store – Let Nature Reclaim You!",
  description:
    "Jivo Mart is the official online store of Jivo Wellness: cold-pressed canola, olive, groundnut, sunflower, mustard, rice bran and soyabean oils, wheatgrass juices, ghee and healthy foods delivered across India.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shop.jivo.in",
  email: "info@jivo.in",
  phone: "+91 8595 349 565",
  phoneHref: "tel:+918595349565",
  tollFree: "1800 137 4433",
  address: "A-35/1, Industrial Area Phase 1, Mayapuri, New Delhi – 110064",
  currency: "INR",
  social: {
    facebook: "https://www.facebook.com/jivowellness",
    twitter: "https://twitter.com/jivo_wellness",
    instagram: "https://www.instagram.com/jivowellness/",
    pinterest: "https://in.pinterest.com/jivo_wellness",
    linkedin: "https://www.linkedin.com/company/jivo-wellness/",
    youtube: "https://www.youtube.com/JivoIn",
  },
  brandSite: "https://jivo.in",
  blogUrl: "https://blog.jivo.in/",
} as const;

/**
 * URL for large media (product videos). Videos live in /public/media/videos by default (177 MB).
 * Set NEXT_PUBLIC_MEDIA_URL (e.g. a CDN bucket) to serve them from somewhere else.
 */
export function mediaUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
  if (!baseUrl || /^https?:\/\//.test(path)) return path;
  return baseUrl.replace(/\/$/, "") + path.replace(/^\/media/, "");
}

/** Formats paise-free rupee amounts the way the old site did: "₹1,899.00" */
export function formatINR(amount: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? true;
  return (
    "₹" +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(amount)
  );
}
