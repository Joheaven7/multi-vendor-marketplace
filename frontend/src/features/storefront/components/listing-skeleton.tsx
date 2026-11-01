import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[4/5] w-full rounded-lg" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export const gridClass = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4";

export function ListingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={gridClass} role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Shown while a page's query string is read (the page shell renders before it). */
export function ListingFallback({ className }: { className?: string }) {
  return (
    <PageContainer className={className}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-10 w-64" />
      <div className={cn("mt-10 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10")}>
        <div className="hidden space-y-4 lg:block" aria-hidden>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
        <ListingSkeleton />
      </div>
    </PageContainer>
  );
}