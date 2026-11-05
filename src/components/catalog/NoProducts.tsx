/**
 * Empty states (cream card + green button): "No products were found matching your selection."
 * with "Clear filters", or for a search the "no products match" message with a link back to the shop.
 */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";

export function NoProducts({ search, clearHref }: { search?: string; clearHref?: string | null }) {
  if (search) {
    return (
      <div className="rounded-[20px] border border-gold/25 bg-cream px-[20px] py-[40px] text-center md:px-[40px] md:py-[56px]" role="status">
        <p className="mx-auto max-w-[620px] font-heading text-[22px] font-semibold leading-[1.3] text-primary md:text-[28px]">Unfortunately, there are no products that match your criteria</p>
        <span aria-hidden="true" className="gold-line mx-auto mt-[14px]" />
        <p className="mx-auto mt-[14px] max-w-[560px] text-[15px] leading-[1.65] text-body">
          We could not find anything for “{search}”. Please check the spelling, try a more general word such as “oil” or “ghee”, or browse all products.
        </p>
        <Link href={routes.shop} className="btn btn-primary mt-6 min-h-[46px]">
          Return to shop
        </Link>
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-[20px] border border-gold/25 bg-cream px-[20px] py-[36px] text-center text-[15px] text-ink md:py-[48px]">
      <span aria-hidden="true" className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-gold/40 bg-white text-gold-dark">
        <Icon name="info" size={20} />
      </span>
      <p className="font-heading text-[19px] font-semibold leading-[1.35] text-primary md:text-[22px]">No products were found matching your selection.</p>
      {clearHref && (
        <Link href={clearHref} className="btn btn-primary mt-2 min-h-[44px]" scroll={false}>
          Clear filters
        </Link>
      )}
    </div>
  );
}
