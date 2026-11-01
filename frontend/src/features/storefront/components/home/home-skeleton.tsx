import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "../listing-skeleton";

export function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading the shop" className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <Skeleton className="h-9 w-56" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-9 w-48" />
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}