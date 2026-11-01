import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { SellerStatusBanner } from "@/features/products/components/seller-status-banner";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={["SELLER"]} area="seller">
      <DashboardShell area="seller">
        <SellerStatusBanner />
        {children}
      </DashboardShell>
    </RoleGuard>
  );
}