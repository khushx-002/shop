/**
 * /<slug>/ – single-segment content URLs, same as the old WordPress site:
 *  - policy pages from the pages table (privacy-policy, refund_returns, shipping-policy,
 *    terms-conditions, disclaimer) → PolicyView
 *  - blog posts from the posts table (e.g. /health-benefits-of-canola-oil/) → BlogPostView
 *
 * Only known slugs exist: generateStaticParams lists them and dynamicParams = false, so the
 * thousands of spam URLs from the hacked old site return 404 without touching the database.
 *
 * The slug list comes from the seed content files (the same files that fill the pages and posts
 * tables), NOT from the database: Next.js runs generateStaticParams in a separate worker process
 * in development, and opening the local PGlite database from a second process fails (PGlite
 * allows one process). A page or post added later must also be added to the seed content
 * (src/content/pages.ts or posts.json) or to EXTRA_SLUGS, then redeployed.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/content/BlogPostView";
import { PolicyView } from "@/components/content/PolicyView";
import { htmlToPlain } from "@/components/content/format";
import { getPage, getPost, getPosts } from "@/lib/catalog";
import { PAGES } from "@/content/pages";
import posts from "@/content/posts.json";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const revalidate = 3600;
export const dynamicParams = false;

/** Pages that have their own route (or would clash with one) are never served here. */
const RESERVED = new Set(["about-us", "faq", "contact-us", "blogs", "shop", "cart", "checkout", "my-account", "wishlist", "compare", "track-order", "admin", "api"]);

type Props = { params: Promise<{ slug: string }> };

/** Seeded outside src/content/pages.ts (scripts/seed.ts adds the privacy policy from legal.json). */
const EXTRA_SLUGS = ["privacy-policy"];

export function generateStaticParams(): { slug: string }[] {
  const slugs = new Set([...PAGES.map((p) => p.slug), ...EXTRA_SLUGS, ...(posts as { slug: string }[]).map((p) => p.slug)]);
  return [...slugs].filter((slug) => !RESERVED.has(slug)).map((slug) => ({ slug }));
}

/** A policy page wins over a post with the same slug (none exist today). */
async function load(slug: string) {
  if (RESERVED.has(slug)) return null;
  const page = await getPage(slug);
  if (page) return { kind: "page" as const, page };
  const post = await getPost(slug);
  if (post) return { kind: "post" as const, post };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) return {};
  if (found.kind === "page") {
    const { page } = found;
    return pageMetadata({ title: page.seoTitle || page.title, description: page.seoDescription || htmlToPlain(page.bodyHtml), path: routes.post(page.slug) });
  }
  const { post } = found;
  const meta = pageMetadata({ title: post.title, description: htmlToPlain(post.excerpt || post.bodyHtml), path: routes.post(post.slug), image: post.coverImage });
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", publishedTime: post.publishedAt } };
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) notFound();
  if (found.kind === "page") return <PolicyView page={found.page} />;
  const related = (await getPosts()).filter((p) => p.slug !== found.post.slug).slice(0, 3);
  return <BlogPostView post={found.post} related={related} />;
}
