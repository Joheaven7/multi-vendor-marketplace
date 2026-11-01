import { Badge, type BadgeVariant } from "./badge";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // Orders
  PENDING: "warning",
  CONFIRMED: "info",
  PROCESSING: "info",
  SHIPPED: "accent",
  DELIVERED: "success",
  CANCELLED: "neutral",
  FAILED: "danger",
  // Payments
  SUCCESSFUL: "success",
  // Sellers and users
  APPROVED: "success",
  ACTIVE: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
  // Products
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  PUBLISHED: "success",
  HIDDEN: "neutral",
  // Stock
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "danger",
};

function toLabel(status: string) {
  const text = status.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toUpperCase();
  return (
    <Badge variant={STATUS_VARIANTS[key] ?? "neutral"} dot className={className}>
      {toLabel(key)}
    </Badge>
  );
}