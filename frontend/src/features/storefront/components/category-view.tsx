"use client";

import { use } from "react";
import Link from "next/link";
import { Tags } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { useCategoryPage } from "../hooks";
import { ProductListing } from "./product-listing";

export function CategoryView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, isLoading, isError, error, refetch } = useCategoryPage(slug);

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-10 w-64" />
      </PageContainer>
    );
  }

  if (isError || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <PageContainer>
        {notFound ? (
          <EmptyState
            icon={<Tags />}
            title="Category not found"
            description="It may have been renamed or removed."
            action={
              <Link href="/shop" className={buttonVariants()}>
                Browse all products
              </Link>
            }
          />
        ) : (
          <ErrorState title="Unable to load this category" onRetry={() => refetch()} />
        )}
      </PageContainer>
    );
  }

  const { category, parent, children } = data;
  const trail: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    ...(parent ? [{ label: parent.name, href: `/category/${parent.slug}` }] : []),
    { label: category.name },
  ];

  return (
    <PageContainer>
      <Breadcrumb items={trail} />
      <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">{category.name}</h1>

      {children.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label={`Subcategories of ${category.name}`}>
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/category/${child.slug}`}
                className="inline-block rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <ProductListing basePath={`/category/${category.slug}`} fixedCategory={category.slug} />
      </div>
    </PageContainer>
  );
}