/**
 * Bottom of /shop/: "Super Oils", "Super Foods", "Special Offers" headlines, each with a
 * product carousel (one card per product, "Select Options" when it has several pack sizes).
 * A section is left out when its category has nothing in stock (the old site showed an
 * empty "Super Foods" block).
 */
import { ProductCard } from "@/components/product/ProductCard";
import { Carousel } from "@/components/ui/Carousel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getCategoryProducts, productCard } from "@/lib/catalog";

const SECTIONS = [
  { id: "s-oils", slug: "super-oils", title: "Super Oils", subtitle: "Explore the range of our top rated products" },
  { id: "s-foods", slug: "super-food", title: "Super Foods", subtitle: "Explore the range of our best products" },
  { id: "s-offers", slug: "special-offers", title: "Special Offers", subtitle: "In demand products clubbed together" },
];

export async function CategoryCarousels() {
  const lists = await Promise.all(SECTIONS.map((s) => getCategoryProducts(s.slug, 12)));
  return (
    <div className="mt-[56px] flex flex-col gap-[56px] border-t border-line bg-cream-light py-[48px] md:mt-[80px] md:gap-[72px] md:py-[72px]">
      {SECTIONS.map((section, i) => {
        const cards = lists[i].map(productCard);
        if (!cards.length) return null;
        return (
          <section key={section.slug} id={section.id} aria-label={section.title} className="scroll-mt-[90px]">
            <div className="px-[10px]">
              <SectionTitle title={section.title} subtitle={section.subtitle} />
            </div>
            <div className="mx-auto mt-[28px] max-w-[1526px] px-[10px] md:mt-[36px] md:px-[20px] min-[64.0625rem]:px-[100px]">
              {/* slide padding: room for the card's 4px hover lift and its soft shadow inside the clipped track */}
              <Carousel perView={{ base: 2, md: 3, lg: 4 }} gap={16} arrows label={section.title} slideClassName="pb-[24px] pt-[8px]">
                {cards.map((card) => (
                  <ProductCard key={card.key} card={card} variant="shop" sizes="(max-width: 767px) 48vw, (max-width: 1024px) 32vw, 290px" />
                ))}
              </Carousel>
            </div>
          </section>
        );
      })}
    </div>
  );
}
