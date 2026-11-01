import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { serverGet } from "@/lib/server-api";
import type { HomeData } from "../../home-types";
import type { ProductCardData } from "../../types";
import { ProductCard } from "../product-card";
import { SellerCard } from "../seller-card";

const shell = "mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8";

function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl tracking-tight text-ink">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover">
          {linkLabel ?? "View all"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function ProductRow({
  title,
  href,
  linkLabel,
  products,
}: {
  title: string;
  href: string;
  linkLabel?: string;
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;

  return (
    <section className={shell} aria-label={title}>
      <SectionHeading title={title} href={href} linkLabel={linkLabel} />
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function CategoryTiles({ categories }: { categories: HomeData["categories"] }) {
  return (
    <section className={shell} aria-label="Shop by category">
      <SectionHeading title="Shop by category" href="/shop" linkLabel="All products" />
      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.slice(0, 8).map((category) => (
          <li key={category.id}>
            <Link
              href={`/category/${category.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-lg border border-line bg-accent-soft"
            >
              {category.image ? (
                <>
                  <Image
                    src={category.image.url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 22vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-ink/60 px-4 py-3 font-display text-lg text-white">
                    {category.name}
                  </span>
                </>
              ) : (
                <span className="flex size-full items-center justify-center px-4 text-center font-display text-2xl text-ink transition-colors group-hover:text-accent">
                  {category.name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Loaded on the server and streamed in behind the skeleton. */
export async function HomeSections() {
  const home = await serverGet<HomeData>("/home");

  if (!home) {
    return (
      <section className={shell}>
        <EmptyState
          icon={<Store />}
          title="The shop is taking a moment"
          description="We could not load the latest products. Please try again shortly."
          action={
            <Link href="/shop" className={buttonVariants()}>
              Browse the shop
            </Link>
          }
        />
      </section>
    );
  }

  if (home.newArrivals.length === 0) {
    return (
      <section className={shell}>
        <EmptyState
          icon={<Store />}
          title="New products are on their way"
          description="Our sellers are getting their stores ready. Check back soon."
        />
      </section>
    );
  }

  return (
    <>
      {home.categories.length > 0 && <CategoryTiles categories={home.categories} />}

      <ProductRow title="New arrivals" href="/shop?sort=newest" products={home.newArrivals} />
      <ProductRow title="On sale" href="/shop?discount=1" products={home.deals} />
      <ProductRow title="Popular right now" href="/shop?sort=popular" products={home.popular} />

      {home.topStores.length > 0 && (
        <section className={shell} aria-label="Top stores">
          <SectionHeading title="Meet our sellers" />
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {home.topStores.map((store) => (
              <li key={store.id}>
                <SellerCard
                  slug={store.slug}
                  storeName={store.storeName}
                  city={store.city}
                  logoUrl={store.logo?.url}
                  productCount={store.productCount}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}