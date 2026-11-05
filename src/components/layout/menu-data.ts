/**
 * Data for the header menus (mega menu, search popup, mobile menu), built on the server from
 * src/content/home.json plus the cached catalog. Nothing here is sent to the browser except
 * what the menus render.
 *
 * Image rule: a menu image is only used when we know its size (src/content/image-sizes.json).
 * Two old mobile-menu files (Canola.png, groundnut.png) were saved as 404 HTML pages, so for
 * those we fall back to the product's mega-menu image, then its pack image, then its first photo.
 */
import "server-only";
import { cache } from "react";
import home from "@/content/home.json";
import { getCategories, getProductsBySlugs, imageSize } from "@/lib/catalog";
import { routes } from "@/lib/routes";

export type MenuTile = { label: string; href: string; image: string | null };
export type MenuBanner = { image: string; title: string; text: string; href: string };
export type MenuLink = { label: string; href: string };
export type MenuProduct = { label: string; href: string; image: string | null; tag: string | null; tagColor: string };
export type MenuGroup = { title: string; items: MenuProduct[] };
export type SearchCategory = { slug: string; name: string };

export type MenuData = {
  tiles: MenuTile[];
  banner: MenuBanner;
  quickLinks: MenuLink[];
  groups: MenuGroup[];
  categories: SearchCategory[];
  trending: MenuLink[];
  searchTitle: string;
};

/**
 * "Cold Press" tag colours (primary green by default). The old menu used maroon and bright red for
 * three products; in the heritage look they use the brown and dark gold tokens (white text stays
 * readable on both: 9:1 and 5:1).
 */
const TAG_COLORS: Record<string, string> = {
  "jivo-kachi-ghani-mustard-oil": "#684C32",
  "jivo-cold-press-sunflower-oil": "#86651D",
  "jivo-cold-press-groundnut-oil": "#684C32",
};

function known(url: string | null | undefined): url is string {
  return !!url && imageSize(url) !== null;
}

export const getMenuData = cache(async (): Promise<MenuData> => {
  const tileImageBySlug = new Map(home.megaMenu.items.map((i) => [i.productSlug, i.image]));
  const slugs = [...new Set([...home.megaMenu.items.map((i) => i.productSlug), ...home.mobileMenu.groups.flatMap((g) => g.items.map((i) => i.productSlug))])];
  const products = new Map((await getProductsBySlugs(slugs)).map((p) => [p.slug, p]));

  const pickImage = (own: string | null | undefined, slug: string): string | null => {
    if (known(own)) return own;
    const tile = tileImageBySlug.get(slug);
    if (known(tile)) return tile;
    const product = products.get(slug);
    const pack = product?.variations.find((v) => v.isDefault)?.image ?? product?.variations[0]?.image;
    if (known(pack)) return pack;
    const photo = product?.images[0]?.url;
    return known(photo) ? photo : null;
  };

  // Only link to products that exist in the catalog (avoids dead links if a product is removed).
  const tiles: MenuTile[] = home.megaMenu.items
    .filter((i) => products.has(i.productSlug))
    .map((i) => ({ label: i.label, href: routes.product(i.productSlug), image: pickImage(i.image, i.productSlug) }));

  const groups: MenuGroup[] = home.mobileMenu.groups
    .map((g) => ({
      title: g.title,
      items: g.items
        .filter((i) => products.has(i.productSlug))
        .map((i) => ({
          label: i.label,
          href: routes.product(i.productSlug),
          image: pickImage(i.image, i.productSlug),
          tag: "tag" in i && typeof i.tag === "string" ? i.tag : null,
          tagColor: TAG_COLORS[i.productSlug] ?? "#0F4526",
        })),
    }))
    .filter((g) => g.items.length > 0);

  // Same list as the old search popup: real categories, A–Z, without WooCommerce's "Uncategorized".
  const categories = (await getCategories())
    .filter((c) => c.slug !== "uncategorized")
    .map((c) => ({ slug: c.slug, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    tiles,
    banner: { image: home.megaMenu.banner, title: home.megaMenu.bannerTitle, text: home.megaMenu.bannerText, href: home.megaMenu.bannerLink },
    quickLinks: home.mobileMenu.quickLinks.map((l) => ({ label: l.label, href: l.href })),
    groups,
    categories,
    trending: home.searchPopup.trending.map((t) => ({ label: t, href: routes.search(t) })),
    searchTitle: home.searchPopup.title,
  };
});
