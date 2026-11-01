"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Price } from "@/components/ui/price";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Rating } from "@/components/ui/rating";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import { useProduct } from "../detail-hooks";
import type { ProductDetail } from "../detail-types";
import {
  findVariant,
  initialSelection,
  isValueAvailable,
  selectValue,
  type Selection,
} from "../variant-selection";
import { ProductCard } from "./product-card";
import { ProductPageSkeleton } from "./product-skeleton";
import { SellerCard } from "./seller-card";

function ProductDetails({ product }: { product: ProductDetail }) {
  const [selection, setSelection] = useState<Selection>(() => initialSelection(product.variants));
  const [quantity, setQuantity] = useState(1);

  const variant = findVariant(product.variants, product.options, selection);
  const maxQuantity = variant?.maxQuantity ?? 0;
  const safeQuantity = Math.max(1, Math.min(quantity, maxQuantity));
  const canBuy = Boolean(variant?.inStock);
  const hasRange = product.maxPrice > product.minPrice;

  const availability = !variant
    ? { text: "Choose an option", className: "text-muted" }
    : !variant.inStock
      ? { text: "Out of stock", className: "text-danger" }
      : variant.stockLeft
        ? { text: `Only ${variant.stockLeft} left`, className: "text-warning" }
        : { text: "In stock", className: "text-success" };

  const trail: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    ...product.categoryTrail.map((category) => ({ label: category.name, href: `/category/${category.slug}` })),
    { label: product.name },
  ];

  return (
    <PageContainer>
      <Breadcrumb items={trail} />

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ImageGallery images={product.images} name={product.name} />
        </div>

        <div>
          {product.brand && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{product.brand.name}</p>
          )}
          <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
            {product.name}
          </h1>

          {product.ratingCount > 0 && (
            <div className="mt-3">
              <Rating value={product.ratingAverage} count={product.ratingCount} size="md" />
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {variant ? (
              <Price
                size="lg"
                price={variant.price}
                finalPrice={variant.finalPrice}
                discountPercent={product.discountPercent}
              />
            ) : (
              <Price
                size="lg"
                price={product.minPrice}
                finalPrice={product.minFinalPrice}
                discountPercent={product.discountPercent}
                from={hasRange}
              />
            )}
            {product.discountPercent > 0 && <Badge variant="accent">-{product.discountPercent}%</Badge>}
          </div>

          <p className={cn("mt-2 text-sm font-medium", availability.className)} role="status">
            {availability.text}
          </p>

          {product.options.length > 0 && (
            <div className="mt-6 space-y-5">
              {product.options.map((option) => (
                <fieldset key={option.name}>
                  <legend className="mb-2 text-sm font-medium text-ink">
                    {option.name}
                    {selection[option.name] && <span className="font-normal text-muted">: {selection[option.name]}</span>}
                  </legend>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={option.name}>
                    {option.values.map((value) => {
                      const selected = selection[option.name]?.toLowerCase() === value.toLowerCase();
                      const available = isValueAvailable(product.variants, selection, option.name, value);

                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => {
                            setSelection(selectValue(product.variants, selection, option.name, value));
                            setQuantity(1);
                          }}
                          className={cn(
                            "min-h-11 min-w-12 rounded-md border px-4 text-sm transition-colors",
                            selected
                              ? "border-accent bg-accent-soft font-medium text-accent"
                              : "border-line-strong bg-surface text-ink hover:border-accent",
                            !available && !selected && "text-subtle line-through",
                          )}
                        >
                          {value}
                          {!available && <span className="sr-only"> (sold out)</span>}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <QuantitySelector
              value={safeQuantity}
              max={maxQuantity}
              disabled={!canBuy}
              onChange={setQuantity}
            />
            <Button
              size="lg"
              className="flex-1"
              disabled={!canBuy}
              onClick={() => toast.info("The cart arrives in the next build phase")}
            >
              {canBuy ? "Add to cart" : "Out of stock"}
            </Button>
          </div>

          <section className="mt-10" aria-labelledby="description-heading">
            <h2 id="description-heading" className="font-display text-xl text-ink">
              Description
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{product.description}</p>
          </section>

          {product.specifications.length > 0 && (
            <section className="mt-10" aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="font-display text-xl text-ink">
                Specifications
              </h2>
              <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex justify-between gap-6 py-3">
                    <dt className="text-muted">{spec.label}</dt>
                    <dd className="text-right text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="mt-10" aria-labelledby="seller-heading">
            <h2 id="seller-heading" className="mb-3 font-display text-xl text-ink">
              Sold by
            </h2>
            <SellerCard
              slug={product.seller.slug}
              storeName={product.seller.storeName}
              city={product.seller.city}
              region={product.seller.region}
            />
          </section>
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-display text-2xl text-ink">
            You may also like
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {product.related.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}

export function ProductView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: product, isLoading, isError, error, refetch } = useProduct(slug);

  if (isLoading) return <ProductPageSkeleton />;

  if (isError || !product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <PageContainer>
        {notFound ? (
          <EmptyState
            icon={<PackageSearch />}
            title="Product not found"
            description="It may have been removed, or the link is wrong."
            action={
              <Link href="/shop" className={buttonVariants()}>
                Browse all products
              </Link>
            }
          />
        ) : (
          <ErrorState title="Unable to load this product" onRetry={() => refetch()} />
        )}
      </PageContainer>
    );
  }

  // `key` resets the chosen options when the visitor moves to another product.
  return <ProductDetails key={product.id} product={product} />;
}