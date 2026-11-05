/**
 * Single blog post in the heritage look: cream page hero with the breadcrumb ("Home › Blogs ›
 * Health & Wellness" + "Return to previous page"), the category as a gold eyebrow, a Playfair
 * title and the date; the cover image (the LCP image, preloaded) overlaps the hero; the body is
 * readable prose (max ~760px) with Playfair headings, then the old "Tags:" line (when the old post
 * had tags), round share buttons, a Super Oils product row and "You may also like" posts.
 * Tags are read from src/content/posts.json (the old site's tags; they are not in the database).
 * The old wide banner slider above the title is not shown: its image was not saved from the old site.
 */
import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/content/PostCard";
import { ShareLinks } from "@/components/content/ShareLinks";
import { formatDate, isoDate } from "@/components/content/format";
import { ProductCard } from "@/components/product/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import postsJson from "@/content/posts.json";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getCategoryProducts, imageSize, productCard } from "@/lib/catalog";
import { routes } from "@/lib/routes";
import { absoluteUrl, articleJsonLd } from "@/lib/seo";
import type { PostView } from "@/lib/types";

/** Post body typography: DM Sans body, Playfair green headings (globals.css base + prose-shop). */
const postProse =
  "text-[16px] leading-[1.8] text-body md:text-[17px] [&_h2]:mt-[1.6em] [&_h2]:text-[26px] [&_h2]:leading-[1.25] md:[&_h2]:text-[30px] [&_h3]:text-[22px] [&_h3]:leading-[1.3] md:[&_h3]:text-[24px] [&_h4]:mb-[.6em] [&_h4]:text-[19px] [&_h4]:leading-[1.35] md:[&_h4]:text-[20px] [&_li]:mb-[6px] [&_strong]:text-ink [&_:is(h2,h3,h4)_strong]:text-primary [&>*:first-child]:mt-0";

export async function BlogPostView({ post, related }: { post: PostView; related: PostView[] }) {
  const products = (await getCategoryProducts("super-oils", 4)).map(productCard);
  const cover = post.coverImage ? { src: post.coverImage, ...(imageSize(post.coverImage) ?? { width: 1000, height: 1000 }) } : null;
  const url = absoluteUrl(routes.post(post.slug));
  const tags = (postsJson as { slug: string; tags?: string[] }[]).find((p) => p.slug === post.slug)?.tags ?? [];

  return (
    <>
      <JsonLd data={articleJsonLd(post)} />

      <article>
        <header className={`page-hero ${cover ? "pb-[96px] md:pb-[150px]" : "pb-[52px] md:pb-[72px]"}`}>
          <div className="site-container pt-[16px] md:pt-[20px]">
            <Breadcrumbs items={[{ label: "Home", href: routes.home }, { label: "Blogs", href: routes.blogs }, { label: post.category }]} showBack />
            <div className="mx-auto mt-[36px] max-w-[860px] text-center md:mt-[52px]">
              <p className="eyebrow">{post.category}</p>
              <h1 className="mt-[12px] font-heading text-[clamp(30px,4.4vw,48px)] font-bold leading-[1.15] text-primary">{post.title}</h1>
              <span aria-hidden="true" className="gold-line mx-auto mt-[18px]" />
              <p className="mt-[14px] text-[14px] text-muted">
                <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden="true"> · </span>
                By Jivo Wellness
              </p>
            </div>
          </div>
        </header>

        <div className="site-container pb-[56px] md:pb-[80px]">
          {cover && (
            <Image
              src={cover.src}
              alt={post.title}
              width={cover.width}
              height={cover.height}
              preload
              sizes="(max-width: 800px) calc(100vw - 32px), 760px"
              className="relative mx-auto -mt-[72px] h-auto w-full max-w-[760px] rounded-[24px] border border-line bg-cream-light shadow-lift md:-mt-[118px]"
            />
          )}

          <div className={`mx-auto max-w-[760px] ${cover ? "mt-[40px]" : "mt-[44px]"}`}>
            <RichText html={post.bodyHtml} className={postProse} />

            {/* Old site: "Tags: a, b, c". Plain text here, because the shop has no tag pages. */}
            {tags.length > 0 && (
              <p className="mt-[32px] flex flex-wrap items-center gap-[8px] text-[15px] text-ink">
                <span className="font-bold">Tags:</span>
                {tags.map((t, i) => (
                  <span key={t} className="badge normal-case tracking-normal">
                    {t}
                    {i < tags.length - 1 && <span className="sr-only">,</span>}
                  </span>
                ))}
              </p>
            )}

            <div className="mt-[32px]">
              <ShareLinks url={url} title={post.title} />
            </div>

            <p className="mt-[26px]">
              <Link
                href={routes.blogs}
                className="inline-flex items-center gap-1 text-[15px] font-bold text-primary underline decoration-gold decoration-2 underline-offset-[6px] transition-colors hover:text-gold-dark"
              >
                <Icon name="chevron-left" size={12} />
                All blogs
              </Link>
            </p>
          </div>
        </div>
      </article>

      {products.length > 0 && (
        <section aria-label="Shop Super Oils" className="section bg-cream-light">
          <div className="site-container">
            <SectionTitle eyebrow="Shop the range" title="Super Oils" subtitle="Cold pressed oils for a healthier kitchen" />
            <ul className="mt-[36px] grid grid-cols-2 gap-x-[14px] gap-y-[24px] md:gap-x-[24px] lg:grid-cols-4">
              {products.map((card) => (
                <li key={card.key}>
                  <ProductCard card={card} variant="carousel" sizes="(max-width: 1024px) 45vw, 260px" />
                </li>
              ))}
            </ul>
            <p className="mt-[36px] text-center">
              <Link href={routes.category("super-oils")} className="btn btn-primary">
                View all Super Oils
              </Link>
            </p>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-label="You may also like" className="site-container section">
          <SectionTitle eyebrow="Keep reading" title="You may also like" />
          <ul className="mt-[36px] flex flex-wrap justify-center gap-[24px] md:gap-[28px]">
            {related.map((p) => (
              <li key={p.slug} className="w-full md:w-[calc(50%-14px)] lg:w-[calc(33.333%-19px)]">
                <PostCard post={p} headingLevel={3} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
