import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { BrandsAdmin } from "@/features/catalog/components/brands-admin";

export const metadata: Metadata = { title: "Brands" };

export default function BrandsPage() {
  return (
    <>
      <PageHeader title="Brands" description="Brands that sellers can attach to their products." />
      <BrandsAdmin />
    </>
  );
}