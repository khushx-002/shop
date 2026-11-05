"use client";
/**
 * Generic slider (Embla) used for banners, product carousels, testimonials and icon boxes.
 *
 *   <Carousel perView={{ base: 2, md: 3, lg: 4 }} gap={20} arrows autoplayMs={3000} loop>
 *     {items.map((x) => <Card key={x.id} {...x} />)}
 *   </Carousel>
 *
 * Each child becomes one slide. Slide width = 100% / perView at each breakpoint
 * (base < 768px <= md < 1025px <= lg).
 */
import { Children, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Icon } from "@/components/ui/Icon";

/* Visitors who ask their device for less motion get no autoplay and slides change without the sliding animation. */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

type PerView = { base: number; md?: number; lg?: number };

type Props = {
  children: React.ReactNode;
  perView?: PerView;
  gap?: number;
  loop?: boolean;
  autoplayMs?: number;
  arrows?: boolean;
  dots?: boolean;
  align?: "start" | "center";
  className?: string;
  slideClassName?: string;
  label?: string;
  dotsClassName?: string;
  arrowClassName?: string;
};

export function Carousel({
  children,
  perView = { base: 1 },
  gap = 20,
  loop = false,
  autoplayMs,
  arrows = false,
  dots = false,
  align = "start",
  className = "",
  slideClassName = "",
  label,
  dotsClassName = "",
  arrowClassName = "",
}: Props) {
  const slides = Children.toArray(children);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: loop && slides.length > 1, align, skipSnaps: false, containScroll: loop ? false : "trimSnaps" },
    autoplayMs ? [Autoplay({ delay: autoplayMs, stopOnInteraction: false, stopOnMouseEnter: true })] : [],
  );
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

  useEffect(() => {
    const autoplay = emblaApi?.plugins().autoplay;
    if (!autoplay) return;
    if (reduceMotion) autoplay.stop();
    else if (!autoplay.isPlaying()) autoplay.play();
  }, [emblaApi, reduceMotion]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const init = () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    };
    init();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", init);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", init);
    };
  }, [emblaApi, onSelect]);

  const md = perView.md ?? perView.base;
  const lg = perView.lg ?? md;
  const style = {
    "--pv-base": perView.base,
    "--pv-md": md,
    "--pv-lg": lg,
    "--gap": `${gap}px`,
  } as React.CSSProperties;

  return (
    <div className={`relative ${className}`} role="region" aria-roledescription="carousel" aria-label={label} style={style}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y" style={{ marginLeft: `calc(var(--gap) * -1)` }}>
          {slides.map((child, i) => (
            // `relative`: absolutely positioned content inside a slide (e.g. sr-only text) must be clipped by the
            // overflow-hidden viewport; otherwise off-screen slides widen the page on phones before Embla starts.
            <div
              key={i}
              className={`relative min-w-0 shrink-0 grow-0 basis-[calc(100%/var(--pv-base))] md:basis-[calc(100%/var(--pv-md))] lg:basis-[calc(100%/var(--pv-lg))] ${slideClassName}`}
              style={{ paddingLeft: "var(--gap)" }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      {arrows && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev(reduceMotion)}
            disabled={!loop && !canPrev}
            aria-label="Previous slide"
            className={`absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-primary/85 text-white shadow-md transition hover:bg-gold disabled:opacity-0 ${arrowClassName}`}
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext(reduceMotion)}
            disabled={!loop && !canNext}
            aria-label="Next slide"
            className={`absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-primary/85 text-white shadow-md transition hover:bg-gold disabled:opacity-0 ${arrowClassName}`}
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </>
      )}
      {/* Before Embla starts, show one dot per slide so the row's space is already there (no layout shift). */}
      {dots && (snaps.length || slides.length) > 1 && (
        <div className={`mt-4 flex justify-center gap-2 ${dotsClassName}`}>
          {(snaps.length ? snaps : slides).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === selected || undefined}
              onClick={() => emblaApi?.scrollTo(i, reduceMotion)}
              className={`h-2.5 rounded-full transition-all ${i === selected ? "w-6 bg-gold" : "w-2.5 bg-[#d8cfbd] hover:bg-gold/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
