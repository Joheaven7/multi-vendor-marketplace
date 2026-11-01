"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldShell, describedBy } from "./field";

type TagInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  max?: number;
  maxLength?: number;
  disabled?: boolean;
};

/** Type a value and press Enter or comma to add it. Backspace removes the last one. */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  error,
  max = 10,
  maxLength = 30,
  disabled,
}: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const addMany = (items: string[]) => {
    const next = [...values];
    for (const raw of items) {
      const value = raw.trim().slice(0, maxLength);
      if (!value || next.length >= max) continue;
      if (next.some((existing) => existing.toLowerCase() === value.toLowerCase())) continue;
      next.push(value);
    }
    if (next.length !== values.length) onChange(next);
  };

  const commit = () => {
    addMany([draft]);
    setDraft("");
  };

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border bg-surface px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30",
          error ? "border-danger" : "border-line-strong",
          disabled && "bg-canvas opacity-70",
        )}
      >
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-2 py-1 text-sm text-accent"
          >
            {value}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="rounded-sm p-0.5 hover:bg-accent/10"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={disabled || values.length >= max}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          placeholder={values.length === 0 ? placeholder : values.length >= max ? "Limit reached" : ""}
          maxLength={maxLength + 1}
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-base text-ink outline-none placeholder:text-subtle"
          onChange={(event) => {
            const text = event.target.value;
            if (text.includes(",")) {
              const parts = text.split(",");
              addMany(parts.slice(0, -1));
              setDraft(parts[parts.length - 1]);
            } else {
              setDraft(text);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
        />
      </div>
    </FieldShell>
  );
}