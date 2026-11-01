import { Suspense } from "react";
import type { Metadata } from "next";
import { ListingFallback } from "@/features/storefront/components/listing-skeleton";
import { CategoryView } from "@/features/storefront/components/category-view";

export const metadata: Metadata = { title: "Category" };

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  // The client view reads the slug from the params promise, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<ListingFallback />}>
      <CategoryView params={params} />
    </Suspense>
  );
}