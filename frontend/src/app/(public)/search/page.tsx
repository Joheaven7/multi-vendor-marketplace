import { Suspense } from "react";
import type { Metadata } from "next";
import { ListingFallback } from "@/features/storefront/components/listing-skeleton";
import { SearchView } from "@/features/storefront/components/search-view";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <Suspense fallback={<ListingFallback />}>
      <SearchView />
    </Suspense>
  );
}