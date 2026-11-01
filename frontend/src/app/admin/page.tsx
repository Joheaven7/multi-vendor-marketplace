import type { Metadata } from "next";
import { Package, Percent, ShoppingBag, Store, TrendingUp, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Admin console" };

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="Marketplace health and activity." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Users" value="0" icon={<Users className="size-4" />} />
        <StatCard label="Sellers" value="0" icon={<Store className="size-4" />} />
        <StatCard label="Products" value="0" icon={<Package className="size-4" />} />
        <StatCard label="Orders" value="0" icon={<ShoppingBag className="size-4" />} />
        <StatCard label="Revenue" value="0 ETB" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Platform commission" value="0 ETB" icon={<Percent className="size-4" />} />
      </div>
      <EmptyState
        className="mt-8"
        icon={<Store />}
        title="Nothing to review"
        description="New seller applications and products awaiting approval will appear here."
      />
    </>
  );
}