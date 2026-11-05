/**
 * The /shop/ page (also /shop/page/N/ and search results /shop/?s=...):
 * cream page hero (title + category tiles), banners, sidebar filters, toolbar, 3-column card grid with
 * "Load More", then the Super Oils / Super Foods / Special Offers carousels.
 */
import { notFound } from "next/navigation";
import { CatalogSidebar } from "@/components/catalog/CatalogSidebar";
import { CategoryCarousels } from "@/components/catalog/CategoryCarousels";
import { getListing } from "@/components/catalog/data";
import { FiltersDrawer } from "@/components/catalog/FiltersDrawer";
import { NoProducts } from "@/components/catalog/NoProducts";
import { parseListingParams, queryString, type RawParams } from "@/components/catalog/params";
import { ShopGrid } from "@/components/catalog/ShopGrid";
import { ShopBanners, ShopCategoryTiles } from "@/components/catalog/ShopTop";
import { Toolbar } from "@/components/catalog/Toolbar";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { getCategories } from "@/lib/catalog";
import { routes } from "@/lib/routes";

export async function ShopView({ page, searchParams }: { page: number; searchParams: RawParams }) {
  const listing = parseListingParams(searchParams);
  const [{ result, descriptions }, categories] = await Promise.all([getListing({ ...listing.query, page }, listing.view === "list"), getCategories()]);
  // /shop/page/9/ past the last page -> 404 (WordPress does the same)
  if (page > 1 && result.page !== page) notFound();
  // ?product_cat=unknown -> show the normal "no products" notice, but never echo unknown slugs in links
  const knownCategory = !listing.category || categories.some((c) => c.slug === listing.category);

  const qs = queryString(listing.params);
  const basePath = routes.shop;
  const filtered = !!(listing.params.min_price || listing.params.max_price || listing.params.stock_status || listing.params.product_cat);
  const clearHref = basePath + queryString(listing.params, { min_price: null, max_price: null, stock_status: null, product_cat: null });

  const sidebar = {
    basePath,
    params: listing.params,
    mode: "shop" as const,
    categories: result.categoryCounts,
    priceBounds: { min: Math.floor(result.priceBounds.minPaise / 100), max: Math.ceil(result.priceBounds.maxPaise / 100) },
    status: listing.status,
    minPrice: listing.minPrice,
    maxPrice: listing.maxPrice,
    search: listing.search,
  };
  const stateKey = qs || "all";

  const crumbs: Crumb[] = [{ label: "Home", href: routes.home }, { label: "Shop", href: basePath }];
  if (listing.search) crumbs.push({ label: "Search results" });
  else if (page > 1) crumbs.push({ label: `Page ${page}` });

  return (
    <>
      {/* cream page hero: breadcrumbs, the page title (one H1) and the category tiles */}
      <section className="page-hero">
        <div className="site-container py-[28px] md:py-[44px] min-[64.0625rem]:!px-[15px]">
          <div className="min-[64.0625rem]:grid min-[64.0625rem]:grid-cols-[minmax(0,1fr)_440px] min-[64.0625rem]:items-center min-[64.0625rem]:gap-[48px]">
            <div className="min-w-0">
              <Breadcrumbs items={crumbs} />
              <h1 className="mt-[14px] break-words font-heading text-[clamp(34px,5vw,56px)] font-bold leading-[1.15] text-primary">
                {listing.search ? <>Search results: “{listing.search}”</> : <>Shop{page > 1 ? ` – page ${page}` : ""}</>}
              </h1>
              <span aria-hidden="true" className="gold-line mt-[16px]" />
              {!listing.search && <p className="mt-[14px] max-w-[560px] text-[15px] leading-[1.65] text-muted md:text-[17px]">Cold-pressed oils, olive oils, ghee, juices and healthy foods from Jivo, delivered across India.</p>}
            </div>
            <ShopCategoryTiles className="mt-[24px] max-w-[440px] min-[64.0625rem]:mt-0" />
          </div>
        </div>
      </section>

      <ShopBanners />

      <div className="site-container mt-[32px] md:mt-[48px] min-[64.0625rem]:!px-[15px]">
        <div className="min-[64.0625rem]:grid min-[64.0625rem]:grid-cols-[260px_minmax(0,1fr)] min-[64.0625rem]:gap-[33px]">
          <aside aria-label="Product filters" className="max-[64.0625rem]:hidden">
            <CatalogSidebar key={stateKey} {...sidebar} />
          </aside>
          <FiltersDrawer key={`d-${stateKey}`} {...sidebar} className="min-[64.0625rem]:hidden" />

          <div className="min-w-0">
            <Toolbar basePath={basePath} params={listing.params} sort={listing.sort} perPage={listing.perPage} view={listing.view} switchClassName="hidden md:flex" showLabelClassName="max-md:hidden" />

            {result.total === 0 || !knownCategory ? (
              <NoProducts search={listing.search || undefined} clearHref={filtered ? clearHref : null} />
            ) : (
              <ShopGrid
                key={`${stateKey}-${page}`}
                cards={result.cards}
                descriptions={descriptions}
                total={result.total}
                page={result.page}
                perPage={result.perPage}
                totalPages={result.totalPages}
                query={qs}
                view={listing.view}
              />
            )}
          </div>
        </div>
      </div>

      <CategoryCarousels />
    </>
  );
}
