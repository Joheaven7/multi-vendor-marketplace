"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { toast } from "@/store/toast-store";
import { useAdminSellers, useSellerAction } from "../hooks";
import type { Seller, SellerAction, SellerStatus } from "../types";
import { ReasonDialog } from "./reason-dialog";
import { SellerDetailsModal } from "./seller-details-modal";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<SellerStatus, string> = {
  PENDING: "Pending",
  REJECTED: "Rejected",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

const EMPTY_TITLES: Record<SellerStatus, string> = {
  PENDING: "No pending applications",
  REJECTED: "No rejected applications",
  ACTIVE: "No active sellers yet",
  SUSPENDED: "No suspended sellers",
};

const SUCCESS_MESSAGES: Record<SellerAction, string> = {
  approve: "Seller approved",
  reject: "Application rejected",
  suspend: "Seller suspended",
  reactivate: "Seller reactivated",
};

/** Admin list of sellers, with one tab per status. */
export function SellerAdminList({ statuses }: { statuses: SellerStatus[] }) {
  const [status, setStatus] = useState<SellerStatus>(statuses[0]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Seller | null>(null);
  const [action, setAction] = useState<SellerAction | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim());
  const query = useAdminSellers({
    status,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const sellerAction = useSellerAction();

  const runAction = async (reason?: string) => {
    if (!selected || !action) return;
    try {
      await sellerAction.mutateAsync({ id: selected.id, action, reason });
      toast.success(SUCCESS_MESSAGES[action], selected.storeName);
      setAction(null);
      setSelected(null);
    } catch (error) {
      toast.error("Action failed", error instanceof Error ? error.message : undefined);
    }
  };

  const columns: Column<Seller>[] = [
    {
      key: "store",
      header: "Store",
      cell: (s) => (
        <div>
          <p className="font-medium">{s.storeName}</p>
          <p className="text-xs text-muted">{s.businessName}</p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (s) => (
        <div>
          <p>{s.owner?.name}</p>
          <p className="text-xs text-muted">{s.owner?.email}</p>
        </div>
      ),
    },
    { key: "location", header: "Location", cell: (s) => `${s.address.city}, ${s.address.region}` },
    { key: "submitted", header: "Submitted", cell: (s) => formatDate(s.submittedAt) },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (s) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(s)}>
          {s.status === "PENDING" ? "Review" : "View"}
        </Button>
      ),
    },
  ];

  const totalPages = query.data?.pagination.totalPages ?? 1;
  const total = query.data?.pagination.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          className="min-w-0 flex-1"
          tabs={statuses.map((s) => ({ id: s, label: STATUS_LABELS[s] }))}
          value={status}
          onValueChange={(id) => {
            setStatus(id as SellerStatus);
            setPage(1);
          }}
        />
        <div className="relative sm:w-64">
          <label htmlFor="seller-search" className="sr-only">
            Search sellers
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id="seller-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search store or business"
            className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-base text-ink placeholder:text-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowKey={(s) => s.id}
        loading={query.isLoading}
        error={query.isError}
        onRetry={() => query.refetch()}
        emptyTitle={debouncedSearch ? "No sellers match your search" : EMPTY_TITLES[status]}
        emptyDescription={debouncedSearch ? "Try a different store or business name." : undefined}
      />

      {!query.isError && total > 0 && (
        <div className="flex flex-col items-center gap-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="text-xs text-muted">
            {total} {total === 1 ? "seller" : "sellers"}
          </p>
        </div>
      )}

      <SellerDetailsModal
        seller={selected}
        open={!!selected && action === null}
        onClose={() => setSelected(null)}
        onAction={setAction}
      />

      <ConfirmDialog
        open={!!selected && (action === "approve" || action === "reactivate")}
        onClose={() => setAction(null)}
        onConfirm={() => runAction()}
        loading={sellerAction.isPending}
        title={action === "approve" ? `Approve ${selected?.storeName}?` : `Reactivate ${selected?.storeName}?`}
        description={
          action === "approve"
            ? "The owner becomes a seller and can start publishing products."
            : "The seller regains access to their store."
        }
        confirmLabel={action === "approve" ? "Approve" : "Reactivate"}
      />

      {selected && (action === "reject" || action === "suspend") && (
        <ReasonDialog
          title={action === "reject" ? `Reject ${selected.storeName}?` : `Suspend ${selected.storeName}?`}
          description={
            action === "reject"
              ? "The applicant can fix the issues and re-apply."
              : "The seller's products will be hidden until you reactivate them."
          }
          submitLabel={action === "reject" ? "Reject application" : "Suspend seller"}
          loading={sellerAction.isPending}
          onClose={() => setAction(null)}
          onSubmit={runAction}
        />
      )}
    </div>
  );
}