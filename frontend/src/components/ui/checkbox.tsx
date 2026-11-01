"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ChoiceProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  description?: string;
};

export function Checkbox({ label, description, id, className, ...props }: ChoiceProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-surface text-on-accent transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-disabled:opacity-50 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Radio({ label, description, id, className, ...props }: ChoiceProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input id={inputId} type="radio" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface transition-colors after:size-2 after:rounded-full after:bg-on-accent after:opacity-0 peer-checked:border-accent peer-checked:bg-accent peer-checked:after:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-disabled:opacity-50"
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}