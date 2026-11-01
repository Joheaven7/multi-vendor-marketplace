import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SellerProductsList } from "@/features/products/components/seller-products-list";

export const metadata: Metadata = { title: "Products" };

export default function SellerProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Create products and track them through review."
        actions={
          <Link href="/seller/products/new" className={buttonVariants()}>
            <Plus className="mr-2 size-4" aria-hidden />
            Add product
          </Link>
        }
      />
      <SellerProductsList />
    </>
  );
}