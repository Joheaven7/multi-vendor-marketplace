"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { FieldShell, describedBy, fieldControl } from "./field";

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export type InputProps = React.ComponentProps<"input"> & FieldProps;

export function Input({
  label,
  hint,
  error,
  wrapperClassName,
  id,
  className,
  required,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(fieldControl, "h-11", error ? "border-danger" : "border-line-strong", className)}
        {...props}
      />
    </FieldShell>
  );
}

export type TextareaProps = React.ComponentProps<"textarea"> & FieldProps;

export function Textarea({
  label,
  hint,
  error,
  wrapperClassName,
  id,
  className,
  required,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(
          fieldControl,
          "min-h-28 resize-y py-3",
          error ? "border-danger" : "border-line-strong",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}