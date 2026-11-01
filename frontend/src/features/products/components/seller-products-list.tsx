"use client";

import { useState } from "react";
import { MoreHorizontal, Package, Pencil, Search, Send, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { ImageThumb } from "@/features/catalog/components/image-thumb";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import {
  useDeleteProduct,
  useSellerProducts,
  useSubmitProduct,
  useWithdrawProduct,
} from "../hooks";
import type { Product, ProductStatus } from "../types";

const PAGE_SIZE = 10;

type Tab = "ALL" | ProductStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Drafts" },
  { id: "PENDING_REVIEW", label: "In review" },
  { id: "PUBLISHED", label: "Published" },
  { id: "REJECTED", label: "Rejected" },
  { id: "HIDDEN", label: "Hidden" },
];

export function SellerProductsList() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Product | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim());
  const query = useSellerProducts({
    status: tab === "ALL" ? undefined : tab,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const submit = useSubmitProduct();
  const withdraw = useWithdrawProduct();
  const remove = useDeleteProduct();

  const run = async (work: () => Promise<unknown>, success: string, name: string) => {
    try {
      await work();
      toast.success(success, name);
    } catch (error) {
      toast.error("Action failed", error instanceof Error ? error.message : undefined);
    }
  };

  const menuFor = (product: Product): DropdownItem[] => {
    const items: DropdownItem[] = [];

    if (product.status !== "PENDING_REVIEW") {
      items.push({
        label: "Edit",
        href: `/seller/products/${product.id}/edit`,
        icon: <Pencil className="size-4" />,
      });
    }
    if (product.status === "DRAFT" || product.status === "REJECTED") {
      items.push({
        label: product.status === "REJECTED" ? "Resubmit for review" : "Submit for review",
        icon: <Send className="size-4" />,
        onSelect: () => run(() => submit.mutateAsync(product.id), "Submitted for review", product.name),
      });
    }
    if (product.status === "PENDING_REVIEW") {
      items.push({
        label: "Withdraw from review",
        icon: <Undo2 className="size-4" />,
        onSelect: () => run(() => withdraw.mutateAsync(product.id), "Withdrawn from review", product.name),
      });
    }
    items.push({
      label: "Delete",
      icon: <Trash2 className="size-4" />,
      danger: true,
      separatorBefore: true,
      onSelect: () => setDeleting(product),
    });
    return items;
  };

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <ImageThumb url={p.images[0]?.url} />
          <div className="min-w-0">
            <p className="max-w-56 truncate font-medium">{p.name}</p>
            <p className="max-w-56 truncate text-xs text-muted">{p.categoryName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (p) => (
        <div>
          <p>
            {p.maxPrice > p.minPrice ? "From " : ""}
            {formatPrice(p.minFinalPrice)}
          </p>
          {p.discountPercent > 0 && <Badge variant="accent">-{p.discountPercent}%</Badge>}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      cell: (p) => (p.totalStock === 0 ? <Badge variant="danger">Out of stock</Badge> : p.totalStock),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={p.status} />
          {p.moderationReason && (
            <span title={p.moderationReason} className="max-w-48 truncate text-xs text-muted">
              {p.moderationReason}
            </span>
          )}
        </div>
      ),
    },
    { key: "updated", header: "Updated", cell: (p) => formatDate(p.updatedAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex justify-end">
          <Dropdown
            label={`Actions for ${p.name}`}
            trigger={<MoreHorizontal className="size-5" />}
            items={menuFor(p)}
          />
        </div>
      ),
    },
  ];

  if (query.error instanceof ApiError && query.error.code === "SELLER_NOT_ACTIVE") {
    return (
      <ErrorState
        title="Your store is not active"
        message="Products are unavailable while your store is suspended. Contact support to resolve this."
      />
    );
  }

  const totalPages = query.data?.pagination.totalPages ?? 1;
  const total = query.data?.pagination.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          className="min-w-0 flex-1"
          tabs={TABS}
          value={tab}
          onValueChange={(id) => {
            setTab(id as Tab);
            setPage(1);
          }}
        />
        <div className="relative sm:w-64">
          <label htmlFor="my-product-search" className="sr-only">
            Search your products
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="my-product-search"
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

      {!query.isLoading && !query.isError && total === 0 && !debouncedSearch && tab === "ALL" ? (
        <EmptyState
          icon={<Package />}
          title="You have no products yet"
          description="Add your first product. It goes live after an admin reviews it."
          action={
            <Link href="/seller/products/new" className={buttonVariants()}>
              Add your first product
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowKey={(p) => p.id}
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => query.refetch()}
          emptyTitle={debouncedSearch ? "No products match your search" : "No products in this tab"}
          emptyDescription={debouncedSearch ? "Try a different name." : undefined}
        />
      )}

      {!query.isError && total > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="text-xs text-muted">
            {total} {total === 1 ? "product" : "products"}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await run(() => remove.mutateAsync(deleting.id), "Product deleted", deleting.name);
          setDeleting(null);
        }}
        loading={remove.isPending}
        variant="danger"
        title={`Delete ${deleting?.name ?? "product"}?`}
        description="It disappears from your list and the store. Past orders keep their record."
        confirmLabel="Delete"
      />
    </div>
  );
}