"use client";
/**
 * Short product reels (rich template): 5 in a row on desktop, a horizontal scroller on phones.
 * Videos are muted and looping like on the old site, but they only download and play while
 * they are on screen (IntersectionObserver) and pause when scrolled away. Visitors who prefer
 * reduced motion get a play button instead of autoplay. Every reel has its own pause button.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

function Reel({ src, index, total }: { src: string; index: number; total: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // The big play button is shown only when the reel will not start by itself
  // (reduced motion, autoplay blocked by the browser, or the visitor paused it).
  const [needsTap, setNeedsTap] = useState(false);
  // null = follow the screen position (autoplay); true/false = the visitor decided
  const userChoice = useRef<boolean | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce && userChoice.current === null) {
      userChoice.current = false;
      setNeedsTap(true);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        const wanted = userChoice.current ?? true;
        if (entry.isIntersecting && wanted) {
          video.play().catch(() => {
            setNeedsTap(true); // autoplay blocked (e.g. data saver): offer the play button
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userChoice.current = true;
      void video.play().catch(() => undefined);
    } else {
      userChoice.current = false;
      video.pause();
      setNeedsTap(true);
    }
  };

  return (
    <div className="relative aspect-[188/334] w-full overflow-hidden rounded-[16px] border border-gold/20 bg-black shadow-soft">
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
        aria-label={`Product video ${index + 1} of ${total}`}
      />
      {!playing && needsTap && (
        <button type="button" onClick={toggle} aria-label={`Play video ${index + 1}`} className="absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-white/90 text-primary shadow-soft">
            <Icon name="play" size={22} />
          </span>
        </button>
      )}
      {playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Pause video ${index + 1}`}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-80 hover:opacity-100 focus-visible:opacity-100"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path fill="currentColor" d="M2 1h3v10H2zM7 1h3v10H7z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function VideoReels({ videos }: { videos: string[] }) {
  if (!videos.length) return null;
  return (
    <section aria-label="Product videos" className="bg-white py-[40px] lg:px-[100px] lg:py-[56px] xl:px-[150px]">
      <ul className="no-scrollbar mx-auto flex max-w-[1140px] snap-x scroll-px-[20px] gap-[10px] overflow-x-auto px-[20px] py-[6px] md:gap-[20px] lg:grid lg:grid-cols-5 lg:gap-[32px] lg:overflow-visible lg:px-0">
        {videos.map((src, i) => (
          <li key={src} className="w-[calc((100%-20px)/3)] shrink-0 snap-start md:w-[calc((100%-40px)/3.2)] lg:w-auto">
            <Reel src={src} index={i} total={videos.length} />
          </li>
        ))}
      </ul>
    </section>
  );
}
