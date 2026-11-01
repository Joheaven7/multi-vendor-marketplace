"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuantitySelectorProps = {
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

const stepButton =
  "flex size-11 items-center justify-center text-ink transition-colors hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-40";

export function QuantitySelector({ value, max, min = 1, onChange, disabled, className }: QuantitySelectorProps) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className={cn("inline-flex h-11 items-center rounded-md border border-line-strong bg-surface", className)}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className={stepButton}
      >
        <Minus className="size-4" />
      </button>
      <span aria-live="polite" className="w-10 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className={stepButton}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}