"use client";
/**
 * Category-page card picture with the old XStore image switcher: small round ‹ › buttons on the
 * picture flip between the card's two images (main + hover image). On phones and tablets the
 * arrows are always shown, like the old site; on desktop they appear on hover/focus, and hovering
 * still shows the second picture as before.
 * Both pictures are rendered from the start (stacked), so switching never moves the layout.
 */
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

type Props = {
  href: string;
  title: string;
  image: { url: string; alt: string };
  second: string;
  sizes: string;
  priority?: boolean;
};

// small round white buttons inside the card's gold picture frame (above it: z-[3])
const ARROW =
  "absolute top-1/2 z-[3] flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gold/30 bg-white/90 text-primary shadow-soft transition hover:border-gold hover:text-gold-dark min-[768px]:opacity-0 min-[768px]:group-hover/img:opacity-100 min-[768px]:focus-visible:opacity-100";
// same photo look as ProductCard: inside the frame, white photo backgrounds take the cream colour
const PHOTO = "object-contain p-[8%] mix-blend-multiply transition-opacity duration-300";

export function CardImageSwitcher({ href, title, image, second, sizes, priority = false }: Props) {
  const [showSecond, setShowSecond] = useState(false);
  const flip = () => setShowSecond((s) => !s);
  return (
    <div className="group/img relative aspect-square overflow-hidden">
      <Link href={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
        <Image
          src={image.url}
          alt={image.alt || title}
          fill
          sizes={sizes}
          className={`${PHOTO} ${showSecond ? "opacity-0" : "min-[768px]:group-hover/img:opacity-0"}`}
          preload={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
        />
        <Image src={second} alt="" fill sizes={sizes} className={`${PHOTO} ${showSecond ? "opacity-100" : "opacity-0 min-[768px]:group-hover/img:opacity-100"}`} loading="lazy" />
      </Link>
      <button type="button" onClick={flip} aria-label={`Previous picture of ${title}`} className={`${ARROW} left-[18px]`}>
        <Icon name="chevron-left" size={15} strokeWidth={1.8} />
      </button>
      <button type="button" onClick={flip} aria-label={`Next picture of ${title}`} className={`${ARROW} right-[18px]`}>
        <Icon name="chevron-right" size={15} strokeWidth={1.8} />
      </button>
    </div>
  );
}
