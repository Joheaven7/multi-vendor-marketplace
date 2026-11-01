import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/features/products/components/product-form";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="New product"
        description="It is saved as a draft. Submit it for review when it is ready."
      />
      <ProductForm />
    </>
  );
}