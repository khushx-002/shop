"use client";
/**
 * Small looping Lottie animation (the animated icons on the home page info tiles).
 * The animation library (lottie_light, ~150 KB) loads only when the icon scrolls into view,
 * and is skipped completely for visitors who prefer reduced motion.
 */
import { useEffect, useRef } from "react";

export function LottieIcon({ src, size = 64, speed = 1, label }: { src: string; size?: number; speed?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim: { destroy: () => void; setSpeed: (s: number) => void } | null = null;
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = async () => {
      const [{ default: lottie }, data] = await Promise.all([import("lottie-web/build/player/lottie_light"), fetch(src).then((r) => r.json())]);
      if (cancelled) return;
      anim = lottie.loadAnimation({ container: el, renderer: "svg", loop: !reduce, autoplay: !reduce, animationData: data });
      anim.setSpeed(speed);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void start();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      anim?.destroy();
    };
  }, [src, speed]);
  return <div ref={ref} style={{ width: size, height: size }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
