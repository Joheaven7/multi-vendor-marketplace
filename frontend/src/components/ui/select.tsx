"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldShell, describedBy, fieldControl } from "./field";

export type SelectProps = React.ComponentProps<"select"> & {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

/** Native select (best mobile UX). Pass <option> elements as children. */
export function Select({
  label,
  hint,
  error,
  wrapperClassName,
  id,
  className,
  required,
  children,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldShell
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, error, hint)}
          className={cn(
            fieldControl,
            "h-11 appearance-none pr-10",
            error ? "border-danger" : "border-line-strong",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </FieldShell>
  );
}