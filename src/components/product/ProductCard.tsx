/**
 * Product card in three layouts, all in the heritage look (docs/13-new-ui-style-guide.md):
 * white card, 20px corners, thin gold border, soft shadow, lifts 4px on hover; cream picture box
 * with a thin inner gold frame; Playfair title in green; full-width green button.
 *
 *  variant="classic"  – category pages (/product-category/...): centred, SALE badge, category,
 *                       variation title, brand, price, add-to-cart button, ‹ › image switcher.
 *  variant="shop"     – /shop/ grid: left aligned title, stars, price, "Add To Cart" button with
 *                       cart icon, wishlist heart on hover.
 *  variant="carousel" – product carousels (Deals of the week, related products, blog):
 *                       image, category, title, stars, price, "Select options"/"Add to cart" button.
 *
 * Works in Server Components (only the buttons are client components).
 */
import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/lib/types";
import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistButton } from "@/components/product/WishlistButton";
import { CardImageSwitcher } from "@/components/product/CardImageSwitcher";

type Props = { card: ProductCardData; variant?: "classic" | "shop" | "carousel"; titleMode?: "product" | "variation"; priority?: boolean; sizes?: string };

/** The card box: lifts 4px with a stronger gold border and shadow on hover (no movement with reduced motion). */
const CARD =
  "group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-gold/25 bg-white shadow-soft transition duration-300 ease-out hover:-translate-y-1 hover:border-gold/45 hover:shadow-lift focus-within:border-gold/45 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** Cream picture box with the thin inner gold frame (12px inset, 13px corners). */
const PICTURE =
  "relative overflow-hidden border-b border-gold/15 bg-linear-to-br from-cream-light to-[#F0E5D0] before:pointer-events-none before:absolute before:inset-3 before:z-[2] before:rounded-[13px] before:border before:border-gold/20 before:content-['']";

/** Product photos sit inside the frame; `multiply` lets white photo backgrounds take the cream colour. */
const PHOTO = "object-contain p-[8%] mix-blend-multiply";

const WISHLIST =
  "flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-white text-primary shadow-soft transition-colors hover:border-gold hover:text-gold-dark";

/**
 * Full-width green button, normal case, ~45px high. On narrow phone cards the small cart icon is
 * hidden so "Select options" stays on one line (text may still wrap instead of overflowing).
 */
const BUTTON = "btn btn-primary mt-3 min-h-[44px] w-full whitespace-normal px-3 text-center text-[13px] max-[480px]:[&>svg]:hidden md:text-[14px]";

/** Small category line above the title (dark gold: readable on white). */
const CATEGORY = "text-[11px] font-bold uppercase tracking-[0.14em] text-gold-dark transition-colors hover:text-primary";

export function ProductCard({ card, variant = "classic", titleMode, priority = false, sizes }: Props) {
  const title = (titleMode ?? (variant === "classic" ? "variation" : "product")) === "variation" ? card.variationTitle || card.name : card.name;
  const imgSizes = sizes ?? "(max-width: 767px) 50vw, (max-width: 1024px) 33vw, 300px";

  // /shop/ grid on tablets (768-1024px): the old Elementor grid showed a ~290px high picture box, not a square
  const box = variant === "shop" ? "aspect-square min-[768px]:max-[1024px]:aspect-auto min-[768px]:max-[1024px]:h-[290px]" : "aspect-square";
  const image = (
    <Link href={card.href} className={`group/img relative block overflow-hidden ${box}`} tabIndex={-1} aria-hidden="true">
      {card.image ? (
        <>
          <Image
            src={card.image.url}
            alt={card.image.alt || title}
            fill
            sizes={imgSizes}
            className={`${PHOTO} transition-opacity duration-300 ${card.hoverImage ? "group-hover/img:opacity-0" : ""}`}
            preload={priority}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
          />
          {card.hoverImage && <Image src={card.hoverImage} alt="" fill sizes={imgSizes} className={`${PHOTO} opacity-0 transition-opacity duration-300 group-hover/img:opacity-100`} loading="lazy" />}
        </>
      ) : (
        <span className="flex h-full items-center justify-center text-[13px] text-muted">No image</span>
      )}
    </Link>
  );
  const wishlist = (
    <div className="absolute right-5 top-5 z-[3] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <WishlistButton productId={card.productId} productName={card.name} className={WISHLIST} />
    </div>
  );
  const sale = card.onSale && card.inStock && <span className="badge-sale left-5 top-5">Sale</span>;

  if (variant === "shop") {
    return (
      <article className={CARD}>
        <div className={PICTURE}>
          {image}
          {wishlist}
        </div>
        <div className="flex flex-1 flex-col p-4 md:p-5">
          <h2 className={`line-clamp-2 font-heading text-[16px] font-semibold leading-[1.3] text-primary md:text-[19px] ${card.kind === "variation" ? "min-h-[2lh]" : ""}`}>
            <Link href={card.href} className="transition-colors hover:text-gold-dark">
              {title}
            </Link>
          </h2>
          {card.kind === "product" && card.ratingAvg > 0 && <Stars rating={card.ratingAvg} size={15} className="mt-2" />}
          <Price pricePaise={card.pricePaise} regularPricePaise={card.regularPricePaise} variant="shop" className="mt-auto pt-3 text-[15px] md:text-[17px]" />
          <AddToCartButton
            variationId={card.kind === "variation" || card.variationCount === 1 ? card.variationId : null}
            href={card.href}
            inStock={card.inStock}
            productName={title}
            showIcon
            label="Add To Cart"
            className={BUTTON}
          />
        </div>
      </article>
    );
  }

  if (variant === "carousel") {
    return (
      <article className={`${CARD} text-center`}>
        <div className={PICTURE}>
          {sale}
          {image}
          {wishlist}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1.5 p-4 md:p-5">
          {card.category && (
            <Link href={`/product-category/${card.category.slug}/`} className={CATEGORY}>
              {card.category.name}
            </Link>
          )}
          <h3 className="line-clamp-2 font-heading text-[16px] font-semibold leading-[1.3] text-primary md:text-[18px]">
            <Link href={card.href} className="transition-colors hover:text-gold-dark">
              {title}
            </Link>
          </h3>
          {card.ratingAvg > 0 && <Stars rating={card.ratingAvg} size={14} />}
          <Price pricePaise={card.pricePaise} regularPricePaise={card.regularPricePaise} variant="classic" className="mt-auto justify-center pt-1 text-[15px] md:text-[16px]" />
          <AddToCartButton variationId={card.variationCount === 1 ? card.variationId : null} href={card.href} inStock={card.inStock} productName={title} className={BUTTON} />
        </div>
      </article>
    );
  }

  // classic (category pages): with a second picture, the old ‹ › image switcher
  return (
    <article className={`${CARD} text-center`}>
      <div className={PICTURE}>
        {sale}
        {card.image && card.hoverImage ? (
          <CardImageSwitcher href={card.href} title={title} image={card.image} second={card.hoverImage} sizes={imgSizes} priority={priority} />
        ) : (
          image
        )}
      </div>
      <div className="flex flex-1 flex-col items-center px-3 pb-4 pt-4 md:px-4">
        {card.categories.length > 0 && (
          <p className="text-[11px] font-bold uppercase leading-[1.5] tracking-[0.14em] text-gold-dark">
            {card.categories.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ", "}
                <Link href={`/product-category/${c.slug}/`} className="transition-colors hover:text-primary">
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        {/* variation titles end with the pack ("– 1+1", "(2 Litre)"), so 3 lines are allowed here */}
        <h2 className="mt-1.5 line-clamp-3 font-heading text-[15px] font-semibold leading-[1.3] text-primary md:text-[17px]">
          <Link href={card.href} className="transition-colors hover:text-gold-dark">
            {title}
          </Link>
        </h2>
        {card.brand && <p className="mt-1 text-[13px] text-muted">{card.brand.name}</p>}
        <Price pricePaise={card.pricePaise} regularPricePaise={card.regularPricePaise} variant="classic" className="mt-auto justify-center pt-2 text-[14px] md:text-[15px]" />
        <AddToCartButton variationId={card.variationId} href={card.href} inStock={card.inStock} productName={title} className={BUTTON} />
      </div>
    </article>
  );
}
