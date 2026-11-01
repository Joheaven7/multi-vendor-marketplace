import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RoleGuard } from "@/features/auth/components/role-guard";

export default function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={["CUSTOMER", "SELLER", "ADMIN"]} area="customer">
      <DashboardShell area="customer">{children}</DashboardShell>
    </RoleGuard>
  );
}