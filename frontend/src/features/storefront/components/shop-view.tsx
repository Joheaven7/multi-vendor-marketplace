"use client";

import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ProductListing } from "./product-listing";

export function ShopView() {
  return (
    <PageContainer>
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">Shop</h1>
      <p className="mt-2 max-w-xl text-muted">Everything from our independent sellers, in one place.</p>
      <div className="mt-10">
        <ProductListing basePath="/shop" />
      </div>
    </PageContainer>
  );
}