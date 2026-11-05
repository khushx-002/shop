"use client";
/**
 * Product gallery (old site: "Iconic WooThumbs"): big image with prev/next arrows, a row of
 * thumbnails underneath, swipe on touch screens and a full-screen viewer with zoom.
 * When the visitor picks a pack that has its own photo, that photo replaces the first image.
 */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ImageView } from "@/lib/types";
import { imageAlt } from "@/components/product/product-utils";
import { Icon } from "@/components/ui/Icon";
import { useModalDialog } from "@/components/layout/useModalDialog";
import { usePack } from "@/components/product/PackContext";

type Props = {
  images: ImageView[];
  productName: string;
  /** "rich" / "standard": both use the cream picture box now; kept for the image `sizes` */
  variant: "rich" | "standard";
};

type Slide = { url: string; alt: string };

export function ProductGallery({ images, productName, variant }: Props) {
  const { selected, chosen } = usePack();

  // The pack photo replaces the first image once a pack is picked (not on first load: the old
  // page also opened with the main product photo).
  const packImage = chosen && selected?.image ? selected.image : null;
  const base: Slide[] = images.map((i) => ({ url: i.url, alt: imageAlt(i.alt, productName) }));
  const slides: Slide[] = packImage
    ? [{ url: packImage, alt: `${productName} – ${selected!.valueLabel}` }, ...base.filter((s, i) => i > 0 && s.url !== packImage)]
    : base;

  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  // Show the first slide again when the pack photo changes ("adjust state while rendering" pattern).
  const [lastPackImage, setLastPackImage] = useState(packImage);
  if (lastPackImage !== packImage) {
    setLastPackImage(packImage);
    setIndex(0);
  }

  const count = slides.length;
  const current = Math.min(index, Math.max(0, count - 1));
  const go = (i: number) => setIndex(((i % count) + count) % count);

  // Keep the active thumbnail visible in the scrolling strip.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-thumb="${current}"]`);
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: left - 8, behavior: "smooth" });
    }
  }, [current]);

  if (!count) {
    return <div className="flex aspect-square items-center justify-center rounded-[24px] border border-gold/20 bg-surface text-muted">No image available</div>;
  }

  const slide = slides[current];
  // heritage picture box: cream gradient, thin gold border
  const frame = "bg-linear-to-br from-cream-light to-[#F0E5D0]";
  const arrow =
    "absolute top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gold/30 bg-white/90 text-primary shadow-soft transition-colors hover:border-gold hover:text-gold-dark";

  return (
    <div className="w-full select-none" aria-roledescription="image gallery" aria-label={`${productName} images`}>
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-[24px] border border-gold/20 ${frame} before:pointer-events-none before:absolute before:inset-[14px] before:z-[1] before:rounded-[16px] before:border before:border-gold/15 before:content-[''] md:before:inset-[18px]`}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null || Math.abs(end - start) < 40 || count < 2) return;
          go(current + (end < start ? 1 : -1));
        }}
      >
        <button
          type="button"
          className="absolute inset-0 block h-full w-full cursor-zoom-in rounded-[24px] focus-visible:-outline-offset-4"
          onClick={() => setViewerOpen(true)}
          aria-label={`Open image ${current + 1} of ${count} in full screen`}
        >
          <Image
            key={slide.url}
            src={slide.url}
            alt={slide.alt}
            fill
            // The standard page shows the gallery full width up to 1024px; the rich page is 2 columns from 768px.
            sizes={variant === "standard" ? "(max-width: 1024px) 100vw, 690px" : "(max-width: 767px) 100vw, (max-width: 1024px) 50vw, 690px"}
            className="object-contain p-[6%] mix-blend-multiply"
            // Only the very first image is the LCP element of the page.
            preload={current === 0 && !packImage}
            loading={current === 0 ? "eager" : "lazy"}
            fetchPriority={current === 0 ? "high" : undefined}
          />
        </button>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Previous image"
              className={`${arrow} left-[10px] md:left-[14px]`}
            >
              <Icon name="chevron-left" size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Next image"
              className={`${arrow} right-[10px] md:right-[14px]`}
            >
              <Icon name="chevron-right" size={20} strokeWidth={2} />
            </button>
          </>
        )}
        <p className="sr-only" aria-live="polite">
          Image {current + 1} of {count}
        </p>
      </div>

      {count > 1 && (
        <div className="relative mt-[12px]">
          <div ref={thumbsRef} className="no-scrollbar flex snap-x gap-[10px] overflow-x-auto md:gap-[12px]" role="group" aria-label="Choose an image">
            {slides.map((s, i) => (
              <button
                key={`${s.url}-${i}`}
                type="button"
                data-thumb={i}
                aria-current={i === current || undefined}
                aria-label={`Show image ${i + 1}: ${s.alt}`}
                onClick={() => setIndex(i)}
                className={`relative aspect-square w-[calc((100%-20px)/3)] shrink-0 snap-start overflow-hidden rounded-[12px] border ${frame} transition-colors focus-visible:-outline-offset-2 md:w-[calc((100%-48px)/5)] ${
                  i === current ? "border-gold shadow-[inset_0_0_0_1px_var(--color-gold)]" : "border-line opacity-90 hover:border-gold/60 hover:opacity-100"
                }`}
              >
                <Image src={s.url} alt="" fill sizes="(max-width: 767px) 33vw, 130px" className="object-contain p-[6%] mix-blend-multiply" loading="lazy" />
              </button>
            ))}
          </div>
          {count > 3 && (
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(current + 1)}
              className={`absolute right-[4px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gold/30 bg-white/90 text-primary shadow-soft hover:border-gold hover:text-gold-dark ${count > 5 ? "" : "md:hidden"}`}
            >
              <Icon name="chevron-right" size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <GalleryViewer open={viewerOpen} onClose={() => setViewerOpen(false)} slides={slides} index={current} onIndex={go} />
    </div>
  );
}

/** Full-screen image viewer (native <dialog>: focus trap + Esc for free). Click the photo to zoom. */
function GalleryViewer({ open, onClose, slides, index, onIndex }: { open: boolean; onClose: () => void; slides: Slide[]; index: number; onIndex: (i: number) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog(open, onClose, { initialFocus: closeRef });
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const slide = slides[index];

  // Leave zoom mode when the image changes or the viewer closes.
  const [lastKey, setLastKey] = useState(`${open}-${index}`);
  if (lastKey !== `${open}-${index}`) {
    setLastKey(`${open}-${index}`);
    setZoom(null);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Product images"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 text-white backdrop:bg-black/60"
      onKeyDown={(e) => {
        if (slides.length < 2) return;
        if (e.key === "ArrowRight") onIndex(index + 1);
        if (e.key === "ArrowLeft") onIndex(index - 1);
      }}
    >
      {open && slide && (
        <div className="relative flex h-full w-full items-center justify-center">
          <button
            type="button"
            className={`relative h-[85vh] w-[92vw] max-w-[1100px] overflow-hidden ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            aria-label={zoom ? "Zoom out" : "Zoom in"}
            onClick={(e) => {
              if (zoom) return setZoom(null);
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
          >
            <Image
              src={slide.url}
              alt={slide.alt}
              fill
              sizes="(max-width: 1100px) 92vw, 1100px"
              className="object-contain transition-transform duration-200"
              style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          </button>
          <p className="absolute left-4 top-4 text-[14px]" aria-live="polite">
            {index + 1} / {slides.length}
          </p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
            <Icon name="close" size={24} />
          </button>
          {slides.length > 1 && (
            <>
              <button type="button" onClick={() => onIndex(index - 1)} aria-label="Previous image" className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Icon name="chevron-left" size={26} />
              </button>
              <button type="button" onClick={() => onIndex(index + 1)} aria-label="Next image" className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Icon name="chevron-right" size={26} />
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
