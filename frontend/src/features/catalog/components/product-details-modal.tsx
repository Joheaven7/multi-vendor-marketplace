"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { cn, formatPrice } from "@/lib/utils";
import { useAdminProduct } from "../hooks";
import type { AdminProduct, ProductAction, ProductStatus } from "../types";

type ProductDetailsModalProps = {
  /** The row from the list, shown immediately while the full details load. */
  summary: AdminProduct;
  onClose: () => void;
  onAction: (action: ProductAction) => void;
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function Footer({
  status,
  onClose,
  onAction,
}: {
  status: ProductStatus;
  onClose: () => void;
  onAction: (action: ProductAction) => void;
}) {
  const deleteButton = (
    <Button
      variant="ghost"
      className="text-danger hover:bg-danger-soft sm:mr-auto"
      onClick={() => onAction("delete")}
    >
      Delete
    </Button>
  );

  switch (status) {
    case "PENDING_REVIEW":
      return (
        <>
          {deleteButton}
          <Button variant="outline" onClick={() => onAction("reject")}>
            Reject
          </Button>
          <Button onClick={() => onAction("approve")}>Approve</Button>
        </>
      );
    case "PUBLISHED":
      return (
        <>
          {deleteButton}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="danger" onClick={() => onAction("hide")}>
            Hide from store
          </Button>
        </>
      );
    case "HIDDEN":
      return (
        <>
          {deleteButton}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onAction("unhide")}>Restore to store</Button>
        </>
      );
    default:
      return (
        <>
          {deleteButton}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      );
  }
}

export function ProductDetailsModal({ summary, onClose, onAction }: ProductDetailsModalProps) {
  const query = useAdminProduct(summary.id);
  const [activeImage, setActiveImage] = useState(0);

  const product = query.data ?? summary;
  const image = product.images[activeImage] ?? product.images[0];
  const hasRange = product.maxPrice > product.minPrice;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={product.name}
      description={product.seller ? `Sold by ${product.seller.storeName}` : undefined}
      footer={<Footer status={product.status} onClose={onClose} onAction={onAction} />}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={product.status} />
          {!product.isSellerActive && <Badge variant="warning">Seller suspended</Badge>}
          <span className="text-sm text-muted">Updated {formatDate(product.updatedAt)}</span>
        </div>

        {product.moderationReason && (
          <Alert variant={product.status === "REJECTED" ? "error" : "warning"}>
            {product.status === "REJECTED" ? "Rejected" : "Hidden"}: {product.moderationReason}
          </Alert>
        )}

        {image && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={`${product.name}, image ${activeImage + 1}`}
              className="max-h-80 w-full rounded-lg border border-line bg-canvas object-contain"
            />
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Product images">
                {product.images.map((img, index) => (
                  <button
                    key={img.publicId}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-pressed={index === activeImage}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden rounded-md border-2",
                      index === activeImage ? "border-accent" : "border-line",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <dl className="grid gap-5 sm:grid-cols-2">
          <Detail label="Category">{product.categoryName ?? "Unknown"}</Detail>
          <Detail label="Brand">{product.brandName ?? "None"}</Detail>
          <Detail label={hasRange ? "Price from" : "Price"}>
            <span className="font-medium">{formatPrice(product.minFinalPrice)}</span>
            {product.discountPercent > 0 && (
              <>
                {" "}
                <span className="text-muted line-through">{formatPrice(product.minPrice)}</span>{" "}
                <Badge variant="accent">-{product.discountPercent}%</Badge>
              </>
            )}
          </Detail>
          <Detail label="Total stock">{product.totalStock}</Detail>
        </dl>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Description</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{product.description}</p>
        </div>

        {product.specifications.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Specifications</h3>
            <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {product.specifications.map((spec) => (
                <div key={spec.label} className="flex justify-between gap-4 border-b border-line py-1.5">
                  <dt className="text-muted">{spec.label}</dt>
                  <dd className="text-right text-ink">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Variants</h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-line">
            {query.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : query.isError ? (
              <ErrorState title="Unable to load variants" onRetry={() => query.refetch()} className="border-0" />
            ) : (
              <Table className="min-w-[30rem]">
                <THead>
                  <TR>
                    <TH>SKU</TH>
                    <TH>Options</TH>
                    <TH className="text-right">Price</TH>
                    <TH className="text-right">Stock</TH>
                  </TR>
                </THead>
                <TBody>
                  {(query.data?.variants ?? []).map((variant) => (
                    <TR key={variant.id}>
                      <TD className="font-medium">{variant.sku}</TD>
                      <TD>
                        {variant.optionValues.map((o) => `${o.name}: ${o.value}`).join(", ") || "Default"}
                      </TD>
                      <TD className="text-right">{formatPrice(variant.finalPrice)}</TD>
                      <TD className="text-right">
                        <span className="mr-2">{variant.stock}</span>
                        <StatusBadge status={variant.stockStatus} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}