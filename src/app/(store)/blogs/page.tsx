/**
 * /blogs/ – list of blog posts (only the 3 real posts; the old page mixed them with spam).
 * Heritage layout: cream page hero, then a grid of soft post cards.
 */
import type { Metadata } from "next";
import { PageHeader } from "@/components/content/PageHeader";
import { PostCard } from "@/components/content/PostCard";
import { getPosts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Blogs",
  description: "Healthy cooking tips, the benefits of canola oil and plant-based recipes from Jivo Wellness.",
  path: routes.blogs,
});

export default async function BlogsPage() {
  const posts = await getPosts();
  return (
    <>
      <PageHeader eyebrow="From the Jivo kitchen" title="Blogs" subtitle="Healthy living tips and recipes from the Jivo kitchen" crumbs={[{ label: "Home", href: routes.home }, { label: "Blogs" }]} />
      <div className="site-container pb-[64px] pt-[40px] md:pb-[88px] md:pt-[56px]">
        {posts.length ? (
          <ul className="grid gap-[24px] md:grid-cols-2 md:gap-[28px] lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card-soft mx-auto max-w-[560px] px-[24px] py-[32px] text-center text-[16px] text-body">No posts yet. Please check back soon.</p>
        )}
      </div>
    </>
  );
}
