"use client";
/**
 * Mobile / tablet filters: the round green tab fixed to the left edge of the screen (as on the
 * old site) opens the sidebar in an off-canvas panel. Native <dialog> + useModalDialog:
 * focus stays inside, Esc closes, focus returns to the tab.
 */
import { useRef, useState } from "react";
import { CatalogSidebar, type SidebarProps } from "@/components/catalog/CatalogSidebar";
import { useModalDialog } from "@/components/layout/useModalDialog";
import { Icon } from "@/components/ui/Icon";

export function FiltersDrawer({ className = "", ...sidebar }: Omit<SidebarProps, "onNavigate"> & { className?: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const ref = useModalDialog(open, () => setOpen(false), { initialFocus: closeRef });

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed left-0 top-[42%] z-40 flex items-center rounded-r-full border border-l-0 border-gold/40 bg-primary py-[13px] pl-[13px] pr-[16px] text-white shadow-lift transition-colors hover:bg-primary-dark"
      >
        <Icon name="filter" size={18} />
        <span className="sr-only">Filters</span>
      </button>

      <dialog
        ref={ref}
        aria-label="Filters"
        onClick={(e) => {
          // a click on the backdrop (the dialog element itself, outside the panel) closes it
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="m-0 h-dvh max-h-none w-[min(340px,88vw)] max-w-none bg-cream-light p-0 text-body shadow-[0_0_30px_rgba(15,69,38,0.2)] backdrop:bg-black/45 open:animate-[slide-in-left_.25s_ease-out] motion-reduce:open:animate-none"
      >
        {open && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
              <p className="font-heading text-[20px] font-semibold text-primary">Filters</p>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-primary transition-colors hover:border-gold hover:text-gold-dark">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-5">
              <CatalogSidebar {...sidebar} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
