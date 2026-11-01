"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { SORT_LABELS, SORT_VALUES, type SortValue } from "../filters";

type SortSelectProps = {
  value: SortValue;
  /** "Most relevant" only makes sense when there is a search term. */
  hasQuery: boolean;
  onChange: (value: SortValue) => void;
};

export function SortSelect({ value, hasQuery, onChange }: SortSelectProps) {
  const id = useId();
  const options = SORT_VALUES.filter((option) => option !== "relevance" || hasQuery);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-sm text-muted sm:block">
        Sort by
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as SortValue)}
          className="h-10 appearance-none rounded-md border border-line-strong bg-surface pl-3 pr-9 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </div>
  );
}