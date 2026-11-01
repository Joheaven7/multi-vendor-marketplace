import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type SellerCardProps = {
  slug: string;
  storeName: string;
  city: string;
  region?: string;
  logoUrl?: string;
  productCount?: number;
};

export function SellerCard({ slug, storeName, city, region, logoUrl, productCount }: SellerCardProps) {
  return (
    <Link
      href={`/store/${slug}`}
      className="group flex items-center gap-4 rounded-lg border border-line bg-surface p-4 transition-shadow hover:shadow-soft"
    >
      <Avatar name={storeName} src={logoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink group-hover:text-accent">{storeName}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{region ? `${city}, ${region}` : city}</span>
        </p>
        {productCount !== undefined && (
          <p className="mt-0.5 text-xs text-muted">
            {productCount} {productCount === 1 ? "product" : "products"}
          </p>
        )}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}