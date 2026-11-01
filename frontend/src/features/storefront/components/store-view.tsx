"use client";

import { use } from "react";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { useStore } from "../detail-hooks";
import { ProductListing } from "./product-listing";

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export function StoreView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: store, isLoading, isError, error, refetch } = useStore(slug);

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-4 w-48" />
        <div className="mt-8 flex items-center gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isError || !store) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <PageContainer>
        {notFound ? (
          <EmptyState
            icon={<Store />}
            title="Store not found"
            description="This store does not exist or is not open right now."
            action={
              <Link href="/shop" className={buttonVariants()}>
                Browse all products
              </Link>
            }
          />
        ) : (
          <ErrorState title="Unable to load this store" onRetry={() => refetch()} />
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: store.storeName }]} />

      <header className="mt-8 flex flex-col gap-5 border-b border-line pb-10 sm:flex-row sm:items-center">
        <Avatar name={store.storeName} src={store.logo?.url} className="size-20 text-2xl" />
        <div className="min-w-0">
          <h1 className="font-display text-4xl tracking-tight text-ink">{store.storeName}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {store.city}, {store.region}
            </span>
            <span>
              {store.productCount} {store.productCount === 1 ? "product" : "products"}
            </span>
            <span>Selling since {monthYear.format(new Date(store.sellingSince))}</span>
          </p>
          {store.description && <p className="mt-4 max-w-2xl text-muted">{store.description}</p>}
        </div>
      </header>

      <div className="mt-10">
        <ProductListing basePath={`/store/${store.slug}`} sellerSlug={store.slug} />
      </div>
    </PageContainer>
  );
}