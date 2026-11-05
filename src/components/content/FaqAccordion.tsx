"use client";
/**
 * Accessible accordion (heritage look: green bold question, gold round +/− icon, thin `line` dividers).
 * Each question is a <button aria-expanded> that controls a role="region" panel.
 * Several answers can be open at once. The answers are rendered on the server and passed in,
 * so they are in the HTML for search engines even while closed (the panel uses `hidden`).
 */
import { useId, useState } from "react";

export type AccordionItem = { id: string; question: string; answer: React.ReactNode };

export function FaqAccordion({ items, headingLevel = 3, defaultOpen = [] }: { items: AccordionItem[]; headingLevel?: 2 | 3; defaultOpen?: string[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen));
  const baseId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="border-t border-line">
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const btnId = `${baseId}-${item.id}-q`;
        const panelId = `${baseId}-${item.id}-a`;
        return (
          <div key={item.id} id={item.id} className="scroll-mt-[100px] border-b border-line">
            <Heading className="m-0 font-sans! text-[16px] font-bold! leading-[1.45]! md:text-[17px]">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 rounded-[8px] px-[4px] py-[18px] text-left text-primary transition-colors hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
              >
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className={`relative flex size-[28px] shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${isOpen ? "border-gold bg-gold text-white" : "border-gold/50 bg-white text-gold"}`}
                >
                  <span className="absolute left-1/2 top-1/2 h-[2px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                  <span
                    className={`absolute left-1/2 top-1/2 h-[12px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "scale-y-0" : ""}`}
                  />
                </span>
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen} className="px-[4px] pb-[22px] pr-[44px] text-[15px] leading-[1.75] text-body md:text-[16px]">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
