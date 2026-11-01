import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryList } from "@/features/products/components/inventory-list";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Update stock levels. Lowest stock is listed first."
      />
      <InventoryList />
    </>
  );
}