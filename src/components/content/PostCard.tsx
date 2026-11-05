/**
 * Blog post card in the heritage look: white soft card (20px corners) with the cover image on top
 * (gentle zoom on hover), category badge, the date as a gold eyebrow, a Playfair title, a 3-line
 * excerpt and a green "Read more" link with a gold underline. Lifts 4px on hover.
 */
import Image from "next/image";
import Link from "next/link";
import { formatDate, htmlToPlain, isoDate } from "@/components/content/format";
import { imageSize } from "@/lib/catalog";
import { routes } from "@/lib/routes";
import type { PostView } from "@/lib/types";

export function PostCard({ post, headingLevel = 2, sizes = "(max-width: 767px) 100vw, (max-width: 1024px) 50vw, 370px" }: { post: PostView; headingLevel?: 2 | 3; sizes?: string }) {
  const href = routes.post(post.slug);
  const size = post.coverImage ? (imageSize(post.coverImage) ?? { width: 1000, height: 1000 }) : null;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const excerpt = htmlToPlain(post.excerpt || post.bodyHtml, 200);
  return (
    <article className="card-soft group flex h-full flex-col overflow-hidden rounded-[20px] shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-[4px] hover:border-gold/45 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {post.coverImage && size && (
        <div className="relative">
          <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden bg-cream-light">
            <Image
              src={post.coverImage}
              alt=""
              width={size.width}
              height={size.height}
              sizes={sizes}
              className="aspect-[4/3] h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          </Link>
          {post.category && <span className="badge absolute left-[14px] top-[14px] bg-white/95 shadow-soft">{post.category}</span>}
        </div>
      )}
      <div className="flex flex-1 flex-col px-[22px] pb-[24px] pt-[20px] md:px-[24px]">
        <p className="eyebrow">
          {!post.coverImage && post.category && (
            <>
              {post.category}
              <span aria-hidden="true"> · </span>
            </>
          )}
          <time dateTime={isoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
        </p>
        <Heading className="mt-[10px] font-heading text-[21px] font-bold leading-[1.3] text-primary">
          <Link href={href} className="transition-colors hover:text-gold-dark">
            {post.title}
          </Link>
        </Heading>
        <p className="mt-[10px] line-clamp-3 text-[15px] leading-[1.65] text-body">{excerpt}</p>
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-[8px] self-start pt-[18px] text-[14px] font-bold text-primary underline decoration-gold decoration-2 underline-offset-[6px] transition-colors hover:text-gold-dark"
        >
          Read more
          <span className="sr-only">: {post.title}</span>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:transition-none">
            <path d="M23.928 11.832c-.048-.12-.12-.216-.168-.264l-7.776-8.16a.72.72 0 0 0-.96-.072c-.288.24-.312.672-.048.984l6.648 6.984H.72a.69.69 0 0 0-.696.696c0 .384.312.672.696.672h20.904l-6.624 7.008a.64.64 0 0 0-.168.48c0 .192.096.36.216.48a.62.62 0 0 0 .48.216c.144 0 .312-.048.48-.192l7.776-8.16s.168-.264.168-.336c.024-.12.024-.216-.024-.336z" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
