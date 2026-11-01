import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import type { ProductCardData } from "../types";

const IMAGE_SIZES = "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 33vw, 50vw";

type ProductCardProps = {
  product: ProductCardData;
  /** Set for the first row of images, so they load before the rest of the page. */
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  return (
    <Link href={`/product/${product.slug}`} className="group block rounded-lg">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-canvas">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes={IMAGE_SIZES}
            priority={priority}
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
              product.inStock ? "" : "opacity-60"
            }`}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-subtle" aria-hidden>
            <ImageIcon className="size-8" />
          </div>
        )}

        {product.secondaryImage && product.inStock && (
          <Image
            src={product.secondaryImage}
            alt=""
            fill
            sizes={IMAGE_SIZES}
            className="absolute inset-0 object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {!product.inStock && <Badge className="bg-surface">Sold out</Badge>}
          {product.inStock && product.discountPercent > 0 && (
            <Badge variant="accent" className="bg-surface">
              -{product.discountPercent}%
            </Badge>
          )}
          {product.inStock && product.isNew && <Badge className="bg-surface">New</Badge>}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {product.brand && (
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted">{product.brand.name}</p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium text-ink group-hover:text-accent">{product.name}</h3>
        {product.ratingCount > 0 && <Rating value={product.ratingAverage} count={product.ratingCount} />}
        <Price
          price={product.minPrice}
          finalPrice={product.minFinalPrice}
          discountPercent={product.discountPercent}
          from={product.maxPrice > product.minPrice}
        />
        {product.seller && <p className="truncate text-xs text-muted">by {product.seller.storeName}</p>}
      </div>
    </Link>
  );
}