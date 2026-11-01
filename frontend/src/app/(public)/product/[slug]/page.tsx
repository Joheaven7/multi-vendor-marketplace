import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductView } from "@/features/storefront/components/product-view";
import { ProductPageSkeleton } from "@/features/storefront/components/product-skeleton";
import { serverGet } from "@/lib/server-api";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await serverGet<{
    product: { name: string; description: string; images: { url: string }[] };
  }>(`/products/${encodeURIComponent(slug)}`);

  if (!data) return { title: "Product" };

  const { product } = data;
  const description = product.description.replace(/\s+/g, " ").slice(0, 160);

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default function ProductPage({ params }: { params: Params }) {
  // The client view reads the slug from the params promise, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductView params={params} />
    </Suspense>
  );
}