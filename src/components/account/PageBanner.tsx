/**
 * Title band under the header of the account, wishlist and compare pages, in the heritage style:
 * a cream `.page-hero` with a gold icon, a small gold eyebrow label, the Playfair title with the
 * gold line and an optional muted subtitle. Holds the page's only <h1>.
 */
import { Icon, type IconName } from "@/components/ui/Icon";

export function PageBanner({ title, icon, eyebrow, subtitle }: { title: string; icon: IconName; eyebrow?: string; subtitle?: string }) {
  return (
    <div className="page-hero">
      <div className="site-container py-[48px] text-center md:py-[68px]">
        <span aria-hidden="true" className="mx-auto mb-[14px] flex size-[52px] items-center justify-center rounded-full border border-gold/40 bg-white/70 text-gold-dark">
          <Icon name={icon} size={22} />
        </span>
        {eyebrow && <span className="eyebrow mb-[10px]">{eyebrow}</span>}
        <h1 className="font-heading text-[clamp(32px,4.6vw,48px)] font-bold leading-[1.15] text-primary">{title}</h1>
        <span aria-hidden="true" className="gold-line mx-auto mt-[16px]" />
        {subtitle && <p className="mx-auto mt-[14px] max-w-[560px] text-[15px] leading-relaxed text-muted md:text-[16px]">{subtitle}</p>}
      </div>
    </div>
  );
}
