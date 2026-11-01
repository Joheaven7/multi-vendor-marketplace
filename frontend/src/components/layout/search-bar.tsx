"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  className?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
};

export function SearchBar({ className, autoFocus, onSubmitted }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const id = useId();

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const value = query.trim();
        if (!value) return;
        router.push(`/search?q=${encodeURIComponent(value)}`);
        onSubmitted?.();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search products, brands, sellers"
        className="h-11 w-full rounded-md border border-line-strong bg-surface pl-10 pr-3 text-base text-ink placeholder:text-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      />
    </form>
  );
}