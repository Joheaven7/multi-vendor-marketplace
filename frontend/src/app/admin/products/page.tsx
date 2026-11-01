import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ProductModerationList } from "@/features/catalog/components/product-moderation-list";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Review new products and keep the catalogue within marketplace rules."
      />
      <ProductModerationList />
    </>
  );
}