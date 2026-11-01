import { cn } from "@/lib/utils";

const styles = {
  error: "border-danger/25 bg-danger-soft text-danger",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  info: "border-info/25 bg-info-soft text-info",
} as const;

type AlertProps = {
  variant?: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-sm", styles[variant], className)}
    >
      {children}
    </div>
  );
}