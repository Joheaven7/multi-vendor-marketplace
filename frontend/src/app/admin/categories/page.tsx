import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { CategoriesAdmin } from "@/features/catalog/components/categories-admin";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise the catalogue into categories and subcategories."
      />
      <CategoriesAdmin />
    </>
  );
}