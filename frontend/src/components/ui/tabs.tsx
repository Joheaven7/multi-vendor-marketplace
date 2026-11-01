"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  content?: React.ReactNode;
};

type TabsProps = {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  className?: string;
};

export function Tabs({ tabs, value, defaultValue, onValueChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id);
  const active = value ?? internal;
  const baseId = useId();

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    select(tabs[next].id);
    document.getElementById(`${baseId}-tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "-mb-px shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors",
                selected ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 rounded-sm bg-ink/5 px-1.5 py-0.5 text-xs">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map(
        (tab) =>
          tab.content !== undefined && (
            <div
              key={tab.id}
              role="tabpanel"
              id={`${baseId}-panel-${tab.id}`}
              aria-labelledby={`${baseId}-tab-${tab.id}`}
              hidden={tab.id !== active}
              className="pt-6"
            >
              {tab.id === active && tab.content}
            </div>
          ),
      )}
    </div>
  );
}