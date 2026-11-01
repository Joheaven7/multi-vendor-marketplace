"use client";

import { X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ListingFilters } from "../filters";

type Chip = { key: string; label: string; remove: Partial<ListingFilters> };

type ActiveFiltersProps = {
  filters: ListingFilters;
  /** brand slug -> display name */
  brandNames: Map<string, string>;
  /** Show the search term as a chip (not needed on the search page, where it is the heading). */
  showQuery: boolean;
  onChange: (patch: Partial<ListingFilters>) => void;
  onClear: () => void;
};

function priceLabel(min: string, max: string) {
  if (min && max) return `${formatPrice(Number(min))} to ${formatPrice(Number(max))}`;
  if (min) return `From ${formatPrice(Number(min))}`;
  return `Up to ${formatPrice(Number(max))}`;
}

export function ActiveFilters({ filters, brandNames, showQuery, onChange, onClear }: ActiveFiltersProps) {
  const chips: Chip[] = [];

  if (showQuery && filters.q) chips.push({ key: "q", label: `Search: ${filters.q}`, remove: { q: "" } });
  for (const slug of filters.brands) {
    chips.push({
      key: `brand-${slug}`,
      label: brandNames.get(slug) ?? slug,
      remove: { brands: filters.brands.filter((b) => b !== slug) },
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: "price",
      label: priceLabel(filters.minPrice, filters.maxPrice),
      remove: { minPrice: "", maxPrice: "" },
    });
  }
  if (filters.rating) chips.push({ key: "rating", label: `${filters.rating} stars & up`, remove: { rating: "" } });
  if (filters.inStock) chips.push({ key: "stock", label: "In stock", remove: { inStock: false } });
  if (filters.discount) chips.push({ key: "sale", label: "On sale", remove: { discount: false } });

  if (chips.length === 0) return null;

  return (
    <ul className="mb-6 flex flex-wrap items-center gap-2" aria-label="Applied filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => onChange(chip.remove)}
            aria-label={`Remove filter: ${chip.label}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-accent"
          >
            {chip.label}
            <X className="size-3.5 text-muted" aria-hidden />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button type="button" onClick={onClear} className="px-1 text-sm font-medium text-accent hover:text-accent-hover">
            Clear all
          </button>
        </li>
      )}
    </ul>
  );
}