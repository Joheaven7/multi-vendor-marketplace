import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductPageSkeleton() {
  return (
    <PageContainer>
      <div role="status" aria-label="Loading product">
        <Skeleton className="h-4 w-64" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
            <div className="mt-3 hidden gap-2 sm:flex">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="size-16" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-6 h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}