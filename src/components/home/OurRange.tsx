/**
 * "Our Range": 4 category cards (old site: Elementor grid b037a6c).
 * The category name is also printed inside each image, so the image is decorative (alt="") and
 * the card's own heading and the "Shop Now" link carry the name.
 *
 * Heritage look: white cards with 20px corners and a thin warm border, the picture fills the
 * rounded top, Playfair title in green, short muted text (DM Sans) and a green outline pill button.
 * Layout: 1 column on small phones, 2 from 480px, 4 on desktop.
 */
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { imageSize } from "@/lib/catalog";
import { routes } from "@/lib/routes";

type RangeItem = { categorySlug: string; title: string; image: string; text: string };

export function OurRange({ title, subtitle, items }: { title: string; subtitle: string; items: RangeItem[] }) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="site-container">
        <SectionTitle eyebrow="Shop by category" title={title} subtitle={subtitle} />
        <ul className="mx-auto mt-[32px] grid max-w-[440px] grid-cols-1 gap-[16px] min-[480px]:max-w-none min-[480px]:grid-cols-2 md:mt-[44px] md:gap-[20px] lg:grid-cols-4">
          {items.map((item) => {
            const href = routes.category(item.categorySlug);
            const size = imageSize(item.image) ?? { width: 500, height: 480 };
            return (
              <li
                key={item.categorySlug}
                className="group flex flex-col overflow-hidden rounded-[20px] border border-line bg-white text-center shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden">
                  <Image
                    src={item.image}
                    alt=""
                    width={size.width}
                    height={size.height}
                    sizes="(max-width: 479px) 92vw, (max-width: 1023px) 46vw, 270px"
                    className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </Link>
                <div className="flex flex-1 flex-col items-center px-[18px] pb-[22px] pt-[18px]">
                  <h3 className="font-heading text-[21px] font-bold leading-[1.2] text-primary">{item.title}</h3>
                  <span aria-hidden="true" className="gold-line mx-auto mt-[10px]" />
                  <p className="mt-[12px] text-[14px] leading-[1.65] text-muted">{item.text}</p>
                  {/* mt-auto keeps the buttons on one line when the texts have different lengths */}
                  <div className="mt-auto pt-[18px]">
                    <Link href={href} className="btn btn-outline btn-pill px-[20px] py-[10px]">
                      Shop Now<span className="sr-only">: {item.title}</span>
                      <Icon name="arrow-left" size={18} strokeWidth={1.8} className="rotate-180" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
