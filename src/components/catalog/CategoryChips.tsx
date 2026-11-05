/**
 * Category chips (round pill links) in the page hero of category pages: "All products" plus the
 * 3 shop categories from content/home.json (the same list as the /shop/ category tiles).
 * The current category is filled green; a category that is not in that list is added as its own chip.
 */
import Link from "next/link";
import home from "@/content/home.json";
import { routes } from "@/lib/routes";

type Chip = { slug: string | null; label: string; href: string };

export function CategoryChips({ current, className = "" }: { current: { slug: string; name: string }; className?: string }) {
  const chips: Chip[] = [{ slug: null, label: "All products", href: routes.shop }, ...home.shopTiles.map((t) => ({ slug: t.categorySlug, label: t.title, href: routes.category(t.categorySlug) }))];
  if (!chips.some((c) => c.slug === current.slug)) chips.push({ slug: current.slug, label: current.name, href: routes.category(current.slug) });

  return (
    <nav aria-label="Product categories" className={className}>
      <ul className="flex flex-wrap gap-[8px]">
        {chips.map((c) => {
          const active = c.slug === current.slug;
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[38px] items-center rounded-full border px-[16px] text-[13px] font-semibold transition-colors ${
                  active ? "border-primary bg-primary text-white" : "border-gold/35 bg-white/85 text-primary hover:border-gold hover:text-gold-dark"
                }`}
              >
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
