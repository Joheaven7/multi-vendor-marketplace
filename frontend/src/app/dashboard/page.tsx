import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Heart, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "My account" };

export default function CustomerDashboardPage() {
  return (
    <>
      <PageHeader title="My account" description="Your orders, wishlist and addresses in one place." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value="0" icon={<Package className="size-4" />} />
        <StatCard label="Wishlist" value="0" icon={<Heart className="size-4" />} />
        <StatCard label="Notifications" value="0" icon={<Bell className="size-4" />} />
      </div>
      <EmptyState
        className="mt-8"
        icon={<Package />}
        title="No orders yet"
        description="When you place an order, you will be able to track every seller's part of it here."
        action={
          <Link href="/shop" className={buttonVariants()}>
            Start shopping
          </Link>
        }
      />
    </>
  );
}