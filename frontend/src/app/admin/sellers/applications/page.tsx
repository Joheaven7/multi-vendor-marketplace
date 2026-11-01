import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SellerAdminList } from "@/features/sellers/components/seller-admin-list";

export const metadata: Metadata = { title: "Seller applications" };

export default function SellerApplicationsPage() {
  return (
    <>
      <PageHeader
        title="Seller applications"
        description="Review new applications. Approved applicants become sellers."
      />
      <SellerAdminList statuses={["PENDING", "REJECTED"]} />
    </>
  );
}