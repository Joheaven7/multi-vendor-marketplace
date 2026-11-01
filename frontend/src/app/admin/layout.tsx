import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RoleGuard } from "@/features/auth/components/role-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard roles={["ADMIN"]} area="admin">
      <DashboardShell area="admin">{children}</DashboardShell>
    </RoleGuard>
  );
}