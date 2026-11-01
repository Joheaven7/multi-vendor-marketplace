"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductListing } from "./product-listing";

export function SearchView() {
  const q = (useSearchParams().get("q") ?? "").trim();

  return (
    <PageContainer>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}
      </h1>

      <div className="mt-10">
        {q ? (
          <ProductListing basePath="/search" showQueryChip={false} />
        ) : (
          <EmptyState
            icon={<Search />}
            title="What are you looking for?"
            description="Use the search bar at the top of the page to find products, brands and sellers."
            action={
              <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
                Browse all products
              </Link>
            }
          />
        )}
      </div>
    </PageContainer>
  );
}