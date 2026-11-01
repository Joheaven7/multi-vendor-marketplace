import { Suspense } from "react";
import type { Metadata } from "next";
import { ListingFallback } from "@/features/storefront/components/listing-skeleton";
import { StoreView } from "@/features/storefront/components/store-view";
import { serverGet } from "@/lib/server-api";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await serverGet<{ store: { storeName: string; description?: string; city: string } }>(
    `/stores/${encodeURIComponent(slug)}`,
  );

  if (!data) return { title: "Store" };

  const { store } = data;
  const description = store.description ?? `Shop products from ${store.storeName} in ${store.city}.`;

  return {
    title: store.storeName,
    description,
    openGraph: { title: store.storeName, description },
  };
}

export default function StorePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ListingFallback />}>
      <StoreView params={params} />
    </Suspense>
  );
}