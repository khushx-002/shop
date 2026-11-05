"use client";
/**
 * Description with "SHOW MORE" / "SHOW LESS" (old Premium "unfold" widget on the rich pages).
 * The full text is always in the HTML (good for SEO); it is only clipped visually.
 */
import { useId, useState } from "react";
import { RichText } from "@/components/ui/RichText";

export function ExpandableDescription({ html, className = "" }: { html: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={className}>
      <div id={id} className={`relative overflow-hidden ${open ? "" : "max-h-[92px] md:max-h-[70px]"}`}>
        <RichText html={html} className="text-[15px] leading-[1.6] text-body md:text-[16px] md:leading-[1.65] [&_p]:mb-2" />
      </div>
      <div className="mt-[6px] text-right">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="px-[14px] py-[4px] text-[13px] font-semibold leading-none text-primary underline decoration-gold underline-offset-4 transition-colors hover:text-gold-dark"
        >
          {open ? "Show less" : "Show more"}
        </button>
      </div>
    </div>
  );
}
