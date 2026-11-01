import { cn, formatPrice } from "@/lib/utils";

const sizes = { sm: "text-sm", md: "text-base", lg: "text-2xl" } as const;

type PriceProps = {
  /** The price before the discount. */
  price: number;
  finalPrice: number;
  discountPercent?: number;
  /** Shows "From" for products whose variants have different prices. */
  from?: boolean;
  size?: keyof typeof sizes;
  className?: string;
};

export function Price({ price, finalPrice, discountPercent = 0, from, size = "md", className }: PriceProps) {
  const discounted = discountPercent > 0 && finalPrice < price;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-xs text-muted">From</span>}
      <span className={cn("font-medium text-ink", sizes[size])}>{formatPrice(finalPrice)}</span>
      {discounted && (
        <span className="text-sm text-subtle line-through">
          <span className="sr-only">Original price </span>
          {formatPrice(price)}
        </span>
      )}
    </p>
  );
}