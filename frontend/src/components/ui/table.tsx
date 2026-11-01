import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { Skeleton } from "./skeleton";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[36rem] border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b border-line bg-canvas text-xs uppercase tracking-wider text-muted", className)}
      {...props}
    />
  );
}

export function TBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line last:border-0", className)} {...props} />;
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return <th scope="col" className={cn("px-4 py-3 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3.5 align-middle text-ink", className)} {...props} />;
}

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  error = false,
  onRetry,
  skeletonRows = 5,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
}: DataTableProps<T>) {
  if (error) return <ErrorState onRetry={onRetry} />;

  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const alignClass = (align?: "left" | "right") => (align === "right" ? "text-right" : "text-left");

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
      <Table>
        <THead>
          <TR>
            {columns.map((col) => (
              <TH key={col.key} className={cn(alignClass(col.align), col.className)}>
                {col.header}
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <TR key={i}>
                  {columns.map((col) => (
                    <TD key={col.key}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TD>
                  ))}
                </TR>
              ))
            : rows.map((row) => (
                <TR key={getRowKey(row)} className="hover:bg-canvas/70">
                  {columns.map((col) => (
                    <TD key={col.key} className={cn(alignClass(col.align), col.className)}>
                      {col.cell(row)}
                    </TD>
                  ))}
                </TR>
              ))}
        </TBody>
      </Table>
    </div>
  );
}