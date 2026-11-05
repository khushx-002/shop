/**
 * Category page (/product-category/<slug>/ and /page/N/): classic XStore shop loop.
 * Cream page hero (breadcrumb, "Return to previous page", title, text, category chips), sidebar filters, toolbar, 4-column grid
 * (3 on tablet, 2 on phones), numbered pagination.
 */
import { notFound } from "next/navigation";
import { BackLink } from "@/components/catalog/BackLink";
import { CatalogSidebar } from "@/components/catalog/CatalogSidebar";
import { CategoryChips } from "@/components/catalog/CategoryChips";
import { getListing, plainText } from "@/components/catalog/data";
import { FiltersDrawer } from "@/components/catalog/FiltersDrawer";
import { ListCard } from "@/components/catalog/ListCard";
import { NoProducts } from "@/components/catalog/NoProducts";
import { Pagination } from "@/components/catalog/Pagination";
import { parseListingParams, queryString, type RawParams } from "@/components/catalog/params";
import { Toolbar } from "@/components/catalog/Toolbar";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { CategoryView as Category } from "@/lib/types";
import { routes } from "@/lib/routes";

export async function CategoryView({ category, page, searchParams }: { category: Category; page: number; searchParams: RawParams }) {
  const parsed = parseListingParams(searchParams);
  // the category comes from the URL path; a ?product_cat= on a category page is ignored
  const params = { ...parsed.params };
  delete params.product_cat;
  const { result, descriptions } = await getListing({ ...parsed.query, category: category.slug, page }, parsed.view === "list");
  if (page > 1 && result.page !== page) notFound();

  const basePath = routes.category(category.slug);
  const qs = queryString(params);
  const filtered = !!(params.min_price || params.max_price || params.stock_status);
  const clearHref = basePath + queryString(params, { min_price: null, max_price: null, stock_status: null });

  const sidebar = {
    basePath,
    params,
    mode: "category" as const,
    currentCategory: category.slug,
    categories: result.categoryCounts,
    priceBounds: { min: Math.floor(result.priceBounds.minPaise / 100), max: Math.ceil(result.priceBounds.maxPaise / 100) },
    status: parsed.status,
    minPrice: parsed.minPrice,
    maxPrice: parsed.maxPrice,
    search: parsed.search,
  };
  const stateKey = `${category.slug}${qs}`;

  const intro = category.description ? plainText(category.description) : "";

  return (
    <>
      {/* cream page hero: breadcrumbs, category name (the one H1), short category text and chips */}
      <section className="page-hero">
        <div className="site-container py-[28px] md:py-[44px] lg:!px-[15px]">
          <div className="flex items-center justify-between gap-3">
            <Breadcrumbs
              items={[
                { label: "Home", href: routes.home },
                { label: "Shop", href: routes.shop },
                { label: category.name, href: basePath },
              ]}
            />
            <BackLink className="max-md:hidden" />
          </div>
          <h1 className="mt-[14px] font-heading text-[clamp(34px,5vw,56px)] font-bold leading-[1.15] text-primary">
            {category.name}
            {page > 1 ? ` – page ${page}` : ""}
          </h1>
          <span aria-hidden="true" className="gold-line mt-[16px]" />
          {intro && <p className="mt-[14px] max-w-[620px] text-[15px] leading-[1.65] text-muted md:text-[17px]">{intro.length > 240 ? `${intro.slice(0, 237).trimEnd()}…` : intro}</p>}
          <CategoryChips current={category} className="mt-[22px]" />
        </div>
      </section>

      <div className="site-container pb-[60px] pt-[32px] md:pt-[48px] lg:!px-[15px]">
        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-[33px]">
          <aside aria-label="Product filters" className="max-lg:hidden">
            <CatalogSidebar key={stateKey} {...sidebar} />
          </aside>
          <FiltersDrawer key={`d-${stateKey}`} {...sidebar} className="lg:hidden" />

          <div className="min-w-0">
            <Toolbar basePath={basePath} params={params} sort={parsed.sort} perPage={parsed.perPage} view={parsed.view} switchClassName="hidden md:flex" showLabelClassName="max-md:hidden" />

            {result.total === 0 ? (
              <NoProducts clearHref={filtered ? clearHref : null} />
            ) : parsed.view === "list" ? (
              <ul className="flex flex-col gap-[20px] md:gap-[24px]">
                {result.cards.map((card, i) => (
                  <li key={card.key}>
                    <ListCard card={card} description={descriptions[card.productId]} titleMode="variation" priority={i < 2} />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-x-[14px] gap-y-[18px] md:grid-cols-3 md:gap-x-[20px] md:gap-y-[26px] lg:grid-cols-4">
                {result.cards.map((card, i) => (
                  <li key={card.key}>
                    <ProductCard card={card} variant="classic" priority={i < 2} sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, 190px" />
                  </li>
                ))}
              </ul>
            )}

            <Pagination page={result.page} totalPages={result.totalPages} href={(n) => routes.categoryPage(category.slug, n) + qs} />
          </div>
        </div>
      </div>
    </>
  );
}
