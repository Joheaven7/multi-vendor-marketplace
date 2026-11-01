import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/ui/skeleton";
import { EditProductView } from "@/features/products/components/edit-product-view";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  // The client view reads the id from the params promise, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<LoadingState message="Loading product…" />}>
      <EditProductView params={params} />
    </Suspense>
  );
}