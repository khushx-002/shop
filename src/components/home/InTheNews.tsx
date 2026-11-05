/**
 * "In The News": 5 press mentions (logo + headline) linking to the articles in a new tab.
 * Desktop: 5-column grid (old container 1d37ca2). Phones/tablets: autoplaying carousel with dots
 * (old widget e2c3e1d: autoplay 4 s, loop).
 *
 * Heritage look (reference "social journey" box): one soft framed box (warm border, 16px corners,
 * light cream background with a faint glow) holding white rounded press tiles.
 */
import Image from "next/image";
import { Carousel } from "@/components/ui/Carousel";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { imageSize } from "@/lib/catalog";

type NewsItem = { title: string; link: string; image: string; source: string };

function NewsCard({ item }: { item: NewsItem }) {
  const size = imageSize(item.image) ?? { width: 167, height: 65 };
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col items-center rounded-[14px] border border-line bg-white px-[16px] pb-[20px] pt-[18px] text-center shadow-soft transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex h-[70px] w-full items-center justify-center border-b border-line pb-[12px]">
        <Image src={item.image} alt={item.source} width={size.width} height={size.height} sizes="150px" className="block h-auto max-h-[58px] w-[150px] max-w-full object-contain" />
      </span>
      <h3 className="mt-[14px] font-heading text-[16px] font-semibold leading-[1.4] text-primary transition-colors group-hover:text-gold-dark min-[1025px]:text-[17px]">
        {item.title}
      </h3>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function InTheNews({ title, items }: { title: string; items: NewsItem[] }) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="site-container">
        <div className="rounded-[16px] border border-[#E9DFCC] bg-cream-light bg-[radial-gradient(ellipse_at_0%_0%,rgba(231,225,202,0.55),transparent_50%),radial-gradient(ellipse_at_100%_100%,rgba(182,138,42,0.07),transparent_45%)] px-[16px] py-[36px] md:px-[36px] md:py-[48px]">
          <SectionTitle eyebrow="As seen in" title={title} />
          <ul className="mt-[36px] hidden grid-cols-5 gap-[16px] min-[1025px]:grid">
            {items.map((item) => (
              <li key={item.link}>
                <NewsCard item={item} />
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-[28px] max-w-[900px] min-[1025px]:hidden">
            <Carousel perView={{ base: 1, md: 3 }} gap={16} loop autoplayMs={4000} dots label={title} dotsClassName="mt-[22px]">
              {items.map((item) => (
                <NewsCard key={item.link} item={item} />
              ))}
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
}
