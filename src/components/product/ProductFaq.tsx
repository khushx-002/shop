"use client";
/**
 * "Got questions? We've got answers" (rich template): topic buttons (Heart Health, Immune System…)
 * that open the matching question, plus an accordion of all questions. Answers are simple HTML.
 */
import { useId, useState } from "react";
import { RichText } from "@/components/ui/RichText";

type Faq = { q: string; a: string };

export function ProductFaq({ heading, tabs, faqs }: { heading: string; tabs: string[]; faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  if (!faqs.length) return null;

  return (
    <section aria-labelledby={`${baseId}-title`} className="bg-cream-light px-[16px] py-[48px] md:py-[72px]">
      <div className="mx-auto max-w-[1000px]">
        <h2 id={`${baseId}-title`} className="text-center font-heading text-[clamp(26px,3vw,38px)] font-bold leading-[1.15] text-primary">
          {heading}
        </h2>
        <span aria-hidden="true" className="gold-line mx-auto mt-[14px]" />
        {tabs.length > 0 && (
          <div className="mt-[26px] flex flex-wrap justify-center gap-[8px]" role="group" aria-label="FAQ topics">
            {tabs.map((t, i) => {
              const active = open === i || (open === null && i === 0);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  aria-controls={i < faqs.length ? `${baseId}-a-${i}` : undefined}
                  onClick={() => i < faqs.length && setOpen(i)}
                  className={`min-h-[40px] rounded-full border px-[16px] py-[8px] text-[14px] font-semibold leading-[20px] transition-colors md:text-[15px] ${
                    active ? "border-primary bg-primary text-white" : "border-gold/35 bg-white text-primary hover:border-gold hover:text-gold-dark"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
        <div className="card-soft mt-[24px] px-[18px] py-[4px] md:px-[28px]">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-line last:border-b-0">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`${baseId}-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`${baseId}-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-[16px] text-left text-[16px] font-bold leading-[1.45] text-primary transition-colors hover:text-gold-dark md:text-[17px]"
                  >
                    <span>{f.q}</span>
                    <span aria-hidden="true" className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-gold/40 text-[18px] font-normal leading-none text-gold-dark">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <div id={`${baseId}-a-${i}`} role="region" aria-labelledby={`${baseId}-q-${i}`} hidden={!isOpen} className="pb-[18px] pr-10">
                  <RichText html={f.a} className="text-[15px] leading-[1.65] text-body" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
