"use client";
/**
 * Sticky add-to-cart bar (old XStore "sticky cart") for the standard product page.
 * It slides in at the bottom of the screen once the main "Add to cart" buttons have scrolled
 * out of view (watched with IntersectionObserver), and hides again when they come back.
 */
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePack } from "@/components/product/PackContext";
import { BagIcon, QuantityStepper, Spinner, packOptionLabel, useAddSelected } from "@/components/product/PurchasePanel";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";

export function StickyAddToCart({ anchorId, image, attributeName }: { anchorId: string; image: string | null; attributeName: string }) {
  const { variations, selected, select, productName, chosen } = usePack();
  const { state, add } = useAddSelected();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(anchorId);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // show only after the buttons have scrolled away upwards (not before the visitor reaches them)
        setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [anchorId, selected?.inStock]);

  const sellable = variations.filter((v) => v.inStock);
  if (!sellable.length) return null;

  const picture = (chosen && selected?.image) || image;

  return (
    <div
      className={`fixed inset-x-0 bottom-[var(--mobile-panel-height)] z-40 border-t border-line bg-white shadow-[0_-8px_28px_rgba(15,69,38,0.08)] transition-[translate,visibility] duration-300 motion-reduce:transition-none min-[1025px]:bottom-0 ${
        show ? "visible translate-y-0" : "pointer-events-none invisible translate-y-[calc(100%+var(--mobile-panel-height)+20px)]"
      }`}
      aria-hidden={!show}
      inert={!show}
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-[15px] py-[10px]">
        {picture && (
          <span className="hidden shrink-0 overflow-hidden rounded-[10px] border border-gold/20 bg-cream-light sm:block">
            <Image src={picture} alt="" width={50} height={50} className="h-[50px] w-[50px] object-contain p-[3px] mix-blend-multiply" loading="lazy" />
          </span>
        )}
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate font-heading text-[16px] font-semibold text-primary">{productName}</p>
          {selected?.inStock && <Price pricePaise={selected.pricePaise} regularPricePaise={selected.regularPricePaise} variant="classic" className="text-[14px]" />}
        </div>
        {variations.length > 1 && (
          <label className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
            <span className="hidden lg:inline">{attributeName}</span>
            <span className="relative">
              <select
                value={selected?.id ?? ""}
                onChange={(e) => select(Number(e.target.value))}
                aria-label={attributeName}
                className="h-[44px] max-w-[150px] cursor-pointer appearance-none rounded-[10px] border border-line bg-white py-0 pl-3 pr-8 text-[14px] text-ink outline-none transition-[border-color,box-shadow] hover:border-gold/60 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(15,69,38,0.12)]"
              >
                {variations.map((v) => (
                  <option key={v.id} value={v.id} disabled={!v.inStock}>
                    {packOptionLabel(v)}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
            </span>
          </label>
        )}
        <QuantityStepper size="sm" />
        <button
          type="button"
          onClick={add}
          disabled={!selected?.inStock || state === "adding"}
          className="btn btn-primary ml-auto h-[44px] shrink-0 px-4 text-[14px] disabled:opacity-60 md:ml-0 md:px-6"
        >
          {state === "adding" ? <Spinner /> : state === "added" ? <Icon name="check" size={15} /> : <BagIcon size={15} />}
          <span>{state === "added" ? "Added" : "Add to cart"}</span>
        </button>
      </div>
    </div>
  );
}
