"use client";

import { useState } from "react";
import { Heart, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Radio } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonText, LoadingState } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/store/toast-store";
import { formatPrice } from "@/lib/utils";

type Order = { id: string; customer: string; total: number; status: string };

const ORDERS: Order[] = [
  { id: "1001-A", customer: "Hanna Bekele", total: 2000, status: "DELIVERED" },
  { id: "1001-B", customer: "Hanna Bekele", total: 3000, status: "SHIPPED" },
  { id: "1002-A", customer: "Dawit Alemu", total: 1500, status: "PROCESSING" },
  { id: "1003-A", customer: "Selam Tadesse", total: 8200, status: "PENDING" },
  { id: "1004-A", customer: "Abel Girma", total: 950, status: "CANCELLED" },
];

const COLUMNS: Column<Order>[] = [
  { key: "id", header: "Order", cell: (o) => <span className="font-medium">{o.id}</span> },
  { key: "customer", header: "Customer", cell: (o) => o.customer },
  { key: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
  { key: "total", header: "Total", align: "right", cell: (o) => formatPrice(o.total) },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10">
      <h2 className="mb-6 font-display text-2xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystemShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(3);
  const [btnLoading, setBtnLoading] = useState(false);

  const handleConfirm = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      setConfirmLoading(false);
      setConfirmOpen(false);
      toast.success("Product deleted");
    }, 900);
  };

  const simulateLoading = () => {
    setBtnLoading(true);
    setTimeout(() => setBtnLoading(false), 1200);
  };

  const toggleTableLoading = () => {
    setTableLoading(true);
    setTimeout(() => setTableLoading(false), 1500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <PageHeader title="Design system" description="Every shared component, in one place." />

      <Section title="Typography">
        <div className="space-y-3">
          <p className="font-display text-5xl tracking-tight">Display heading</p>
          <p className="font-display text-3xl">Section heading</p>
          <p className="text-base">Body text uses Inter for clarity at small sizes.</p>
          <p className="text-sm text-muted">Secondary text for descriptions and hints.</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button loading={btnLoading} onClick={simulateLoading}>
            Click to load
          </Button>
          <Button leftIcon={<Plus className="size-4" />}>With icon</Button>
          <Button variant="outline" size="icon" aria-label="Add to wishlist">
            <Heart className="size-4" />
          </Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-6 md:grid-cols-2">
          <Input label="Product name" placeholder="Leather sneakers" hint="Shown on the product page." />
          <Input label="Email" type="email" defaultValue="not-an-email" error="Enter a valid email address." />
          <Select label="Category" defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            <option>Shoes</option>
            <option>Shirts</option>
          </Select>
          <Input label="Disabled" disabled defaultValue="Cannot edit" />
          <Textarea label="Description" wrapperClassName="md:col-span-2" placeholder="Describe the product" />
          <div className="space-y-4">
            <Checkbox label="Free delivery only" description="Hide items with a delivery fee." />
            <Checkbox label="Disabled option" disabled />
          </div>
          <div className="space-y-4">
            <Radio name="sort" label="Newest" defaultChecked />
            <Radio name="sort" label="Price: low to high" />
          </div>
        </div>
      </Section>

      <Section title="Badges, status and avatars">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED", "PENDING_REVIEW", "OUT_OF_STOCK"].map(
            (status) => (
              <StatusBadge key={status} status={status} />
            ),
          )}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Avatar name="Hanna Bekele" size="sm" />
          <Avatar name="Dawit Alemu" />
          <Avatar name="Selam Tadesse" size="lg" />
        </div>
      </Section>

      <Section title="Stat cards">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Revenue" value="125,000 ETB" hint="+12% this month" />
          <StatCard label="Orders" value="83" hint="5 pending" />
          <StatCard label="Products" value="46" hint="3 low on stock" />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          tabs={[
            { id: "all", label: "All orders", count: 5, content: <p className="text-sm text-muted">All orders.</p> },
            { id: "pending", label: "Pending", count: 1, content: <p className="text-sm text-muted">Pending orders.</p> },
            { id: "done", label: "Delivered", content: <p className="text-sm text-muted">Delivered orders.</p> },
          ]}
        />
      </Section>

      <Section title="Overlays and feedback">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Open drawer
          </Button>
          <Button variant="outline" leftIcon={<Trash2 className="size-4" />} onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <Dropdown
            label="Actions"
            trigger={<span className="px-2 text-sm font-medium">Dropdown</span>}
            triggerClassName="border border-line-strong bg-surface"
            align="left"
            items={[
              { label: "Edit", onSelect: () => toast.info("Edit clicked") },
              { label: "Duplicate", onSelect: () => toast.info("Duplicate clicked") },
              { label: "Delete", danger: true, separatorBefore: true, onSelect: () => setConfirmOpen(true) },
            ]}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" variant="ghost" onClick={() => toast.success("Product added to cart", "Shoes, size 42")}>
            Success toast
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.error("Payment failed", "Please try again.")}>
            Error toast
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.warning("Only 2 left in stock")}>
            Warning toast
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.info("Order status updated")}>
            Info toast
          </Button>
        </div>
      </Section>

      <Section title="Loading, empty and error states">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-line bg-surface p-5">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <SkeletonText lines={2} />
          </div>
          <LoadingState message="Loading products…" className="rounded-lg border border-line bg-surface" />
          <EmptyState
            title="Your wishlist is empty"
            description="Save items you love and find them here later."
            icon={<Heart />}
            action={<Button>Browse products</Button>}
          />
          <ErrorState title="Unable to load products" onRetry={() => toast.info("Retrying…")} />
        </div>
      </Section>

      <Section title="Data table and pagination">
        <div className="mb-4">
          <Button size="sm" variant="outline" onClick={toggleTableLoading}>
            Simulate loading
          </Button>
        </div>
        <DataTable columns={COLUMNS} rows={ORDERS} getRowKey={(o) => o.id} loading={tableLoading} />
        <Pagination className="mt-6" page={page} totalPages={12} onPageChange={setPage} />
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit product"
        description="Changes are saved when you press Save."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false);
                toast.success("Product saved");
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" defaultValue="Leather sneakers" />
          <Input label="Price (ETB)" type="number" defaultValue={1500} />
        </div>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" side="right">
        <div className="space-y-5 p-5">
          <Select label="Category" defaultValue="all">
            <option value="all">All</option>
            <option>Shoes</option>
          </Select>
          <Checkbox label="In stock only" />
          <Button className="w-full" onClick={() => setDrawerOpen(false)}>
            Apply filters
          </Button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Delete this product?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={confirmLoading}
      />
    </div>
  );
}