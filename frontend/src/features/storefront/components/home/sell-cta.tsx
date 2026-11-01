import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function SellCta() {
  return (
    <section className="mt-12 bg-ink text-white" aria-labelledby="sell-heading">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-xl">
          <h2 id="sell-heading" className="font-display text-3xl tracking-tight sm:text-4xl">
            Have something worth selling?
          </h2>
          <p className="mt-3 text-white/70">
            Open your own store on Marketplace. Every application is reviewed by our team, and you only manage your
            own products and orders.
          </p>
        </div>
        <Link
          href="/become-seller"
          className={buttonVariants({ size: "lg", className: "bg-white text-ink hover:bg-white/90" })}
        >
          Apply to sell
        </Link>
      </div>
    </section>
  );
}