/**
 * List view card (?view_mode=list): image on the left, details on the right
 * (category, title, brand, price, short description, add to cart) in a white heritage card with a
 * cream, gold-framed picture box (same look as ProductCard).
 * Works in Server and Client Components.
 */
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Price } from "@/components/ui/Price";
import { routes } from "@/lib/routes";
import type { ProductCardData } from "@/lib/types";

type Props = { card: ProductCardData; description?: string; titleMode: "product" | "variation"; priority?: boolean };

export function ListCard({ card, description, titleMode, priority = false }: Props) {
  const title = titleMode === "variation" ? card.variationTitle || card.name : card.name;
  return (
    <article className="group grid grid-cols-[minmax(110px,38%)_1fr] items-center gap-4 rounded-[20px] border border-gold/25 bg-white p-[10px] shadow-soft transition duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-lift focus-within:border-gold/45 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:grid-cols-[240px_1fr] sm:gap-[28px] sm:p-[14px]">
      <div className="relative overflow-hidden rounded-[14px] bg-linear-to-br from-cream-light to-[#F0E5D0] before:pointer-events-none before:absolute before:inset-[10px] before:z-[2] before:rounded-[10px] before:border before:border-gold/20 before:content-['']">
        {card.onSale && card.inStock && <span className="badge-sale left-[16px] top-[16px]">Sale</span>}
        <Link href={card.href} className="relative block aspect-square overflow-hidden" tabIndex={-1} aria-hidden="true">
          {card.image ? (
            <>
              <Image
                src={card.image.url}
                alt={card.image.alt || title}
                fill
                sizes="(max-width: 639px) 38vw, 240px"
                className={`object-contain p-[8%] mix-blend-multiply transition-opacity duration-300 ${card.hoverImage ? "group-hover:opacity-0" : ""}`}
                preload={priority}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : undefined}
              />
              {card.hoverImage && <Image src={card.hoverImage} alt="" fill sizes="(max-width: 639px) 38vw, 240px" className="object-contain p-[8%] opacity-0 mix-blend-multiply transition-opacity duration-300 group-hover:opacity-100" loading="lazy" />}
            </>
          ) : (
            <span className="flex h-full items-center justify-center text-[13px] text-muted">No image</span>
          )}
        </Link>
      </div>
      <div className="min-w-0 py-1 pr-1 text-left sm:pr-3">
        {card.categories.length > 0 && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-dark">
            {card.categories.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ", "}
                <Link href={routes.category(c.slug)} className="transition-colors hover:text-primary">
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        <h2 className="mt-1.5 line-clamp-3 font-heading text-[17px] font-semibold leading-[1.3] text-primary sm:text-[22px]">
          <Link href={card.href} className="transition-colors hover:text-gold-dark">
            {title}
          </Link>
        </h2>
        {card.brand && <p className="mt-1 text-[13px] text-muted">{card.brand.name}</p>}
        <Price pricePaise={card.pricePaise} regularPricePaise={card.regularPricePaise} variant="classic" className="mt-2 text-[16px] sm:text-[17px]" />
        {description && <p className="mt-3 hidden text-[14px] leading-[1.65] text-body sm:block">{description}</p>}
        <AddToCartButton
          variationId={card.variationId}
          href={card.href}
          inStock={card.inStock}
          productName={title}
          className="btn btn-primary mt-4 min-h-[44px] whitespace-normal px-[18px] text-center text-[13px] sm:min-w-[170px] sm:text-[14px]"
        />
      </div>
    </article>
  );
}
