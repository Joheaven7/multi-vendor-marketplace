"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageSearch, SlidersHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { usePublicCategories } from "@/features/products/hooks";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  PAGE_SIZE,
  activeFilterCount,
  defaultSort,
  parseFilters,
  toSearchParams,
  type ListingFilters,
} from "../filters";
import { useProductListing } from "../hooks";
import { ActiveFilters } from "./active-filters";
import { FilterPanel } from "./filter-panel";
import { ListingSkeleton, gridClass } from "./listing-skeleton";
import { ProductCard } from "./product-card";
import { SortSelect } from "./sort-select";

type ProductListingProps = {
  /** The path the filters are written to, e.g. "/shop" or "/category/men". */
  basePath: string;
  /** Set on category pages, where the category comes from the path instead of the query string. */
  fixedCategory?: string;
  /** Set on store pages: only this seller's products are listed. */
  sellerSlug?: string;
  /** Show the search term as a removable chip. Not needed on the search page itself. */
  showQueryChip?: boolean;
};

export function ProductListing({
  basePath,
  fixedCategory,
  sellerSlug,
  showQueryChip = true,
}: ProductListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = useMemo<ListingFilters>(() => {
    const parsed = parseFilters(new URLSearchParams(searchParams.toString()));
    return fixedCategory ? { ...parsed, category: fixedCategory } : parsed;
  }, [searchParams, fixedCategory]);

  const apiQuery = useMemo(() => {
    const params = toSearchParams(filters);
    params.set("limit", String(PAGE_SIZE));
    if (sellerSlug) params.set("seller", sellerSlug);
    return params.toString();
  }, [filters, sellerSlug]);

  const query = useProductListing(apiQuery);
  const categories = usePublicCategories();

  const navigate = (next: ListingFilters) => {
    const qs = toSearchParams(next, { omitCategory: Boolean(fixedCategory) }).toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  /** Any change goes back to page 1, unless it is the page itself that changed. */
  const update = (patch: Partial<ListingFilters>) => navigate({ ...filters, page: 1, ...patch });

  const clearAll = () =>
    navigate({
      ...EMPTY_FILTERS,
      q: filters.q,
      category: filters.category,
      sort: defaultSort(filters.q),
    });

  const changePage = (page: number) => {
    update({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const data = query.data;
  const items = data?.items ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;
  const activeCount = activeFilterCount(filters);
  const brandNames = useMemo(
    () => new Map((data?.facets.brands ?? []).map((brand) => [brand.slug, brand.name])),
    [data],
  );

  const panel = (idPrefix: string) => (
    <FilterPanel
      idPrefix={idPrefix}
      filters={filters}
      facets={data?.facets}
      categories={categories.data ?? []}
      activeCategory={filters.category}
      showCategories={!sellerSlug}
      activeCount={activeCount}
      onChange={update}
      onClear={clearAll}
    />
  );

  let body: React.ReactNode;
  if (query.isLoading) {
    body = <ListingSkeleton />;
  } else if (query.isError) {
    body = <ErrorState title="Unable to load products" onRetry={() => query.refetch()} />;
  } else if (items.length === 0) {
    const pastTheEnd = total > 0 && filters.page > 1;
    body = (
      <EmptyState
        icon={<PackageSearch />}
        title={pastTheEnd ? "That page does not exist" : "No products found"}
        description={
          pastTheEnd
            ? "There are fewer results than that."
            : activeCount > 0 || filters.q
              ? "Try removing a filter or searching for something else."
              : "There is nothing here yet. Check back soon."
        }
        action={
          pastTheEnd ? (
            <Button onClick={() => changePage(1)}>Go to the first page</Button>
          ) : activeCount > 0 ? (
            <Button onClick={clearAll}>Clear filters</Button>
          ) : (
            <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
              Browse all products
            </Link>
          )
        }
      />
    );
  } else {
    body = (
      <div className={cn(gridClass, "lg:grid-cols-3", query.isPlaceholderData && "opacity-60 transition-opacity")}>
        {items.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 4} />
        ))}
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
      <aside className="hidden lg:block" aria-label="Filters">
        {panel("sidebar")}
      </aside>

      <div className="min-w-0">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              leftIcon={<SlidersHorizontal className="size-4" />}
              onClick={() => setFiltersOpen(true)}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
            <p aria-live="polite" className="text-sm text-muted">
              {query.isLoading ? "Loading…" : `${total} ${total === 1 ? "product" : "products"}`}
            </p>
          </div>
          <SortSelect value={filters.sort} hasQuery={Boolean(filters.q)} onChange={(sort) => update({ sort })} />
        </div>

        <ActiveFilters
          filters={filters}
          brandNames={brandNames}
          showQuery={showQueryChip}
          onChange={update}
          onClear={clearAll}
        />

        {body}

        {!query.isError && totalPages > 1 && (
          <Pagination className="mt-12" page={filters.page} totalPages={totalPages} onPageChange={changePage} />
        )}
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" side="left">
        <div className="flex min-h-full flex-col">
          <div className="flex-1 p-5">{panel("drawer")}</div>
          <div className="sticky bottom-0 border-t border-line bg-surface p-4">
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>
              Show {total} {total === 1 ? "product" : "products"}
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}