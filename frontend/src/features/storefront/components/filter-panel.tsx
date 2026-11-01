"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox, Radio } from "@/components/ui/checkbox";
import type { Category } from "@/features/catalog/types";
import { cn } from "@/lib/utils";
import type { ListingFilters } from "../filters";
import type { ListingFacets } from "../types";

type FilterPanelProps = {
  /** Keeps form-control names unique when the panel is on screen twice (sidebar and drawer). */
  idPrefix: string;
  filters: ListingFilters;
  facets?: ListingFacets;
  categories: Category[];
  activeCategory: string;
  /** False on a store page, where marketplace categories would only lead the visitor away. */
  showCategories: boolean;
  activeCount: number;
  onChange: (patch: Partial<ListingFilters>) => void;
  onClear: () => void;
};

const linkClass = "block rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:text-ink";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-5 first:pt-0 last:border-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink">{title}</h3>
      {children}
    </section>
  );
}

const cleanNumber = (value: string) => value.replace(/\D/g, "").slice(0, 9);

/** Remounted (via `key`) when the applied range changes, so the inputs always match the URL. */
function PriceFilter({
  minValue,
  maxValue,
  range,
  onApply,
}: {
  minValue: string;
  maxValue: string;
  range?: { min: number; max: number };
  onApply: (min: string, max: string) => void;
}) {
  const [min, setMin] = useState(minValue);
  const [max, setMax] = useState(maxValue);
  const invalid = min !== "" && max !== "" && Number(min) > Number(max);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid) onApply(min, max);
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="price-min">
          Minimum price in ETB
        </label>
        <input
          id="price-min"
          inputMode="numeric"
          placeholder={range ? String(range.min) : "Min"}
          value={min}
          onChange={(event) => setMin(cleanNumber(event.target.value))}
          className="h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-base focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        />
        <span className="text-muted" aria-hidden>
          –
        </span>
        <label className="sr-only" htmlFor="price-max">
          Maximum price in ETB
        </label>
        <input
          id="price-max"
          inputMode="numeric"
          placeholder={range ? String(range.max) : "Max"}
          value={max}
          onChange={(event) => setMax(cleanNumber(event.target.value))}
          className="h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-base focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        />
      </div>
      {invalid && (
        <p role="alert" className="text-sm text-danger">
          The minimum cannot be higher than the maximum.
        </p>
      )}
      <Button type="submit" variant="outline" size="sm" disabled={invalid}>
        Apply (ETB)
      </Button>
    </form>
  );
}

export function FilterPanel({
  idPrefix,
  filters,
  facets,
  categories,
  activeCategory,
  showCategories,
  activeCount,
  onChange,
  onClear,
}: FilterPanelProps) {
  const toggleBrand = (slug: string, on: boolean) =>
    onChange({ brands: on ? [...filters.brands, slug] : filters.brands.filter((b) => b !== slug) });

  return (
    <div>
      {activeCount > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted">
            {activeCount} {activeCount === 1 ? "filter" : "filters"} applied
          </p>
          <button type="button" onClick={onClear} className="text-sm font-medium text-accent hover:text-accent-hover">
            Clear all
          </button>
        </div>
      )}

      {showCategories && (
        <Section title="Categories">
          <nav aria-label="Categories">
            <ul className="-mx-2">
              <li>
                <Link
                  href="/shop"
                  aria-current={activeCategory === "" ? "page" : undefined}
                  className={cn(linkClass, activeCategory === "" && "font-medium text-ink")}
                >
                  All products
                </Link>
              </li>
              {categories.map((top) => {
                const childActive = top.children?.some((child) => child.slug === activeCategory) ?? false;
                const open = activeCategory === top.slug || childActive;

                return (
                  <li key={top.id}>
                    <Link
                      href={`/category/${top.slug}`}
                      aria-current={activeCategory === top.slug ? "page" : undefined}
                      className={cn(linkClass, activeCategory === top.slug && "font-medium text-ink")}
                    >
                      {top.name}
                    </Link>
                    {open && top.children && top.children.length > 0 && (
                      <ul className="ml-3 border-l border-line pl-2">
                        {top.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/category/${child.slug}`}
                              aria-current={activeCategory === child.slug ? "page" : undefined}
                              className={cn(linkClass, activeCategory === child.slug && "font-medium text-ink")}
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </Section>
      )}

      {facets && facets.brands.length > 0 && (
        <Section title="Brand">
          <ul className="max-h-60 space-y-3 overflow-y-auto pr-1">
            {facets.brands.map((brand) => (
              <li key={brand.id}>
                <Checkbox
                  label={`${brand.name} (${brand.count})`}
                  checked={filters.brands.includes(brand.slug)}
                  onChange={(event) => toggleBrand(brand.slug, event.target.checked)}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Price">
        <PriceFilter
          key={`${filters.minPrice}-${filters.maxPrice}`}
          minValue={filters.minPrice}
          maxValue={filters.maxPrice}
          range={facets && facets.priceRange.max > 0 ? facets.priceRange : undefined}
          onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
        />
      </Section>

      <Section title="Rating">
        <div className="space-y-3" role="radiogroup" aria-label="Minimum rating">
          {[
            ["4", "4 stars & up"],
            ["3", "3 stars & up"],
            ["", "Any rating"],
          ].map(([value, label]) => (
            <Radio
              key={label}
              name={`rating-${idPrefix}`}
              label={label}
              checked={filters.rating === value}
              onChange={() => onChange({ rating: value })}
            />
          ))}
        </div>
      </Section>

      <Section title="Availability">
        <div className="space-y-3">
          <Checkbox
            label="In stock only"
            checked={filters.inStock}
            onChange={(event) => onChange({ inStock: event.target.checked })}
          />
          <Checkbox
            label="On sale"
            checked={filters.discount}
            onChange={(event) => onChange({ discount: event.target.checked })}
          />
        </div>
      </Section>
    </div>
  );
}