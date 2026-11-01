"use client";

import { use } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/store/toast-store";
import { useSellerProduct, useWithdrawProduct } from "../hooks";
import { ProductForm } from "./product-form";

export function EditProductView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError, error, refetch } = useSellerProduct(id);
  const withdraw = useWithdrawProduct();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          icon={<PackageSearch />}
          title="Product not found"
          description="It may have been deleted."
          action={
            <Link href="/seller/products" className={buttonVariants()}>
              Back to products
            </Link>
          }
        />
      );
    }
    if (error instanceof ApiError && error.code === "SELLER_NOT_ACTIVE") {
      return (
        <ErrorState
          title="Your store is not active"
          message="You cannot edit products while your store is suspended."
        />
      );
    }
    return <ErrorState title="Unable to load this product" onRetry={() => refetch()} />;
  }

  const handleWithdraw = async () => {
    try {
      await withdraw.mutateAsync(product.id);
      toast.success("Withdrawn from review", "You can edit it now.");
    } catch (err) {
      toast.error("Could not withdraw", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <>
      <PageHeader
        title="Edit product"
        description={product.name}
        actions={<StatusBadge status={product.status} />}
      />

      {product.status === "PENDING_REVIEW" ? (
        <EmptyState
          title="This product is being reviewed"
          description="Withdraw it from review to make changes. You can submit it again afterwards."
          action={
            <Button onClick={handleWithdraw} loading={withdraw.isPending}>
              Withdraw from review
            </Button>
          }
        />
      ) : (
        <>
          {product.status === "REJECTED" && product.moderationReason && (
            <Alert variant="error" className="mb-6">
              Rejected: {product.moderationReason}
            </Alert>
          )}
          {product.status === "HIDDEN" && product.moderationReason && (
            <Alert variant="warning" className="mb-6">
              Hidden by an admin: {product.moderationReason}
            </Alert>
          )}
          {product.status === "PUBLISHED" && (
            <Alert variant="info" className="mb-6">
              This product is live. Changes you save are visible to customers immediately.
            </Alert>
          )}
          <ProductForm key={product.updatedAt} product={product} />
        </>
      )}
    </>
  );
}