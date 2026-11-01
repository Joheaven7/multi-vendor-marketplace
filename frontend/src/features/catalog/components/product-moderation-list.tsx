"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { ReasonDialog } from "@/features/sellers/components/reason-dialog";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import { useAdminProducts, useProductAction } from "../hooks";
import type { AdminProduct, ProductAction, ProductStatus } from "../types";
import { ImageThumb } from "./image-thumb";
import { ProductDetailsModal } from "./product-details-modal";

const PAGE_SIZE = 10;

const TABS: { id: ProductStatus; label: string }[] = [
  { id: "PENDING_REVIEW", label: "Pending review" },
  { id: "PUBLISHED", label: "Published" },
  { id: "HIDDEN", label: "Hidden" },
  { id: "REJECTED", label: "Rejected" },
];

const EMPTY_TITLES: Record<string, string> = {
  PENDING_REVIEW: "Nothing waiting for review",
  PUBLISHED: "No published products yet",
  HIDDEN: "No hidden products",
  REJECTED: "No rejected products",
};

const SUCCESS_MESSAGES: Record<ProductAction, string> = {
  approve: "Product published",
  reject: "Product rejected",
  hide: "Product hidden",
  unhide: "Product restored",
  delete: "Product deleted",
};

export function ProductModerationList() {
  const [status, setStatus] = useState<ProductStatus>("PENDING_REVIEW");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [action, setAction] = useState<ProductAction | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim());
  const query = useAdminProducts({
    status,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const productAction = useProductAction();

  const runAction = async (reason?: string) => {
    if (!selected || !action) return;
    try {
      await productAction.mutateAsync({ id: selected.id, action, reason });
      toast.success(SUCCESS_MESSAGES[action], selected.name);
      setAction(null);
      setSelected(null);
    } catch (error) {
      toast.error("Action failed", error instanceof Error ? error.message : undefined);
    }
  };

  const columns: Column<AdminProduct>[] = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <ImageThumb url={p.images[0]?.url} />
          <div className="min-w-0">
            <p className="max-w-56 truncate font-medium">{p.name}</p>
            <p className="max-w-56 truncate text-xs text-muted">
              {[p.categoryName, p.brandName].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      ),
    },
    { key: "seller", header: "Seller", cell: (p) => p.seller?.storeName ?? "Unknown" },
    {
      key: "price",
      header: "Price",
      cell: (p) => (
        <div>
          <p>{formatPrice(p.minFinalPrice)}</p>
          {p.discountPercent > 0 && <Badge variant="accent">-{p.discountPercent}%</Badge>}
        </div>
      ),
    },
    { key: "stock", header: "Stock", cell: (p) => p.totalStock },
    { key: "updated", header: "Updated", cell: (p) => formatDate(p.updatedAt) },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={p.status} />
          {!p.isSellerActive && <Badge variant="warning">Seller suspended</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(p)}>
          {p.status === "PENDING_REVIEW" ? "Review" : "View"}
        </Button>
      ),
    },
  ];

  const totalPages = query.data?.pagination.totalPages ?? 1;
  const total = query.data?.pagination.total ?? 0;
  const confirming = action === "approve" || action === "unhide" || action === "delete";
  const askingReason = action === "reject" || action === "hide";

  const confirmCopy: Record<string, { title: string; description: string; label: string }> = {
    approve: {
      title: `Publish ${selected?.name}?`,
      description: "The product becomes visible in the store.",
      label: "Publish",
    },
    unhide: {
      title: `Restore ${selected?.name}?`,
      description: "The product becomes visible in the store again.",
      label: "Restore",
    },
    delete: {
      title: `Delete ${selected?.name}?`,
      description: "The product disappears everywhere. This cannot be undone from the dashboard.",
      label: "Delete",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          className="min-w-0 flex-1"
          tabs={TABS}
          value={status}
          onValueChange={(id) => {
            setStatus(id as ProductStatus);
            setPage(1);
          }}
        />
        <div className="relative sm:w-64">
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="product-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by product name"
            className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-base text-ink placeholder:text-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowKey={(p) => p.id}
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle={debouncedSearch ? "No products match your search" : EMPTY_TITLES[status]}
        emptyDescription={debouncedSearch ? "Try a different product name." : undefined}
      />

      {!query.isError && total > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="text-xs text-muted">
            {total} {total === 1 ? "product" : "products"}
          </p>
        </div>
      )}

      {selected && action === null && (
        <ProductDetailsModal summary={selected} onClose={() => setSelected(null)} onAction={setAction} />
      )}

      {selected && confirming && action && (
        <ConfirmDialog
          open
          onClose={() => setAction(null)}
          onConfirm={() => runAction()}
          loading={productAction.isPending}
          variant={action === "delete" ? "danger" : "primary"}
          title={confirmCopy[action].title}
          description={confirmCopy[action].description}
          confirmLabel={confirmCopy[action].label}
        />
      )}

      {selected && askingReason && (
        <ReasonDialog
          title={action === "reject" ? `Reject ${selected.name}?` : `Hide ${selected.name}?`}
          description={
            action === "reject"
              ? "The seller can fix the issues and submit the product again."
              : "The product is removed from the store until you restore it."
          }
          submitLabel={action === "reject" ? "Reject product" : "Hide product"}
          loading={productAction.isPending}
          onClose={() => setAction(null)}
          onSubmit={runAction}
        />
      )}
    </div>
  );
}