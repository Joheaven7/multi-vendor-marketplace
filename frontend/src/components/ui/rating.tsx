import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingProps = {
  /** 0 to 5. Partial values fill part of the last star. */
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
};

const starSize = { sm: "size-3.5", md: "size-4.5" } as const;

function Stars({ size }: { size: keyof typeof starSize }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={cn("shrink-0 fill-current", starSize[size])} strokeWidth={1.5} />
      ))}
    </>
  );
}

export function Rating({ value, count, size = "sm", className }: RatingProps) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const label = `Rated ${value.toFixed(1)} out of 5${count !== undefined ? `, ${count} reviews` : ""}`;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} role="img" aria-label={label}>
      <span className="relative inline-flex" aria-hidden>
        <span className="inline-flex text-line-strong">
          <Stars size={size} />
        </span>
        <span className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-accent" style={{ width: `${percent}%` }}>
          <Stars size={size} />
        </span>
      </span>
      <span className="text-xs text-muted" aria-hidden>
        {value.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </span>
    </span>
  );
}