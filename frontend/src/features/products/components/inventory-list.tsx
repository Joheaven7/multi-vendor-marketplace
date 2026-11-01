"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { ImageThumb } from "@/features/catalog/components/image-thumb";
import { ApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { toast } from "@/store/toast-store";
import { useInventory, useSetStock } from "../hooks";
import type { InventoryItem, StockStatus } from "../types";

const PAGE_SIZE = 15;

type Tab = "ALL" | StockStatus;

const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "LOW_STOCK", label: "Low stock" },
  { id: "OUT_OF_STOCK", label: "Out of stock" },
];

/** Remounted (via `key`) whenever the saved stock changes, so the input always shows the truth. */
function StockCell({ item }: { item: InventoryItem }) {
  const setStock = useSetStock();
  const [value, setValue] = useState(String(item.stock));

  const parsed = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 1_000_000;
  const dirty = valid && parsed !== item.stock;

  const save = async () => {
    if (!dirty) return;
    try {
      await setStock.mutateAsync({ variantId: item.id, stock: parsed });
      toast.success("Stock updated", `${item.sku}: ${parsed}`);
    } catch (error) {
      toast.error("Could not update stock", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={`Stock for ${item.sku}`}
        aria-invalid={!valid}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
        }}
        className="h-9 w-24 rounded-md border border-line-strong bg-surface px-2 text-right text-base text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 aria-[invalid=true]:border-danger"
      />
      <Button size="sm" disabled={!dirty} loading={setStock.isPending} onClick={save}>
        Save
      </Button>
    </div>
  );
}

export function InventoryList() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebouncedValue(search.trim());
  const query = useInventory({
    stockStatus: tab === "ALL" ? undefined : tab,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  if (query.error instanceof ApiError && query.error.code === "SELLER_NOT_ACTIVE") {
    return (
      <ErrorState
        title="Your store is not active"
        message="Inventory is unavailable while your store is suspended."
      />
    );
  }

  const columns: Column<InventoryItem>[] = [
    {
      key: "product",
      header: "Product",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <ImageThumb url={item.product.image} />
          <div className="min-w-0">
            {item.product.status === "PENDING_REVIEW" ? (
              <p className="max-w-56 truncate font-medium">{item.product.name}</p>
            ) : (
              <Link
                href={`/seller/products/${item.product.id}/edit`}
                className="block max-w-56 truncate font-medium hover:text-accent"
              >
                {item.product.name}
              </Link>
            )}
            <p className="max-w-56 truncate text-xs text-muted">
              {item.optionValues.map((o) => o.value).join(" / ") || "Default"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "sku", header: "SKU", cell: (item) => <span className="font-mono text-xs">{item.sku}</span> },
    { key: "status", header: "Status", cell: (item) => <StatusBadge status={item.stockStatus} /> },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      cell: (item) => <StockCell key={`${item.id}:${item.stock}`} item={item} />,
    },
  ];

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
          <label htmlFor="inventory-search" className="sr-only">
            Search inventory
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="inventory-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by SKU or product"
            className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-base text-ink placeholder:text-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowKey={(item) => item.id}
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle={
          debouncedSearch
            ? "No variants match your search"
            : tab === "ALL"
              ? "No inventory yet"
              : tab === "LOW_STOCK"
                ? "Nothing is running low"
                : "Nothing is out of stock"
        }
        emptyDescription={
          tab === "ALL" && !debouncedSearch ? "Variants appear here once you add products." : undefined
        }
      />

      {!query.isError && total > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Boxes className="size-3.5" aria-hidden />
            {total} {total === 1 ? "variant" : "variants"}, lowest stock first
          </p>
        </div>
      )}
    </div>
  );
}