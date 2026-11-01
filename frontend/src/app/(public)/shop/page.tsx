import { Suspense } from "react";
import type { Metadata } from "next";
import { ListingFallback } from "@/features/storefront/components/listing-skeleton";
import { ShopView } from "@/features/storefront/components/shop-view";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse products from independent sellers.",
};

export default function ShopPage() {
  // The listing reads the query string, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<ListingFallback />}>
      <ShopView />
    </Suspense>
  );
}