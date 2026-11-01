import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SellerAdminList } from "@/features/sellers/components/seller-admin-list";

export const metadata: Metadata = { title: "Sellers" };

export default function SellersPage() {
  return (
    <>
      <PageHeader title="Sellers" description="Manage approved sellers and suspensions." />
      <SellerAdminList statuses={["ACTIVE", "SUSPENDED"]} />
    </>
  );
}