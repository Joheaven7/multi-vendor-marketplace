import Link from "next/link";
import { BadgeCheck, ShoppingBag, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const promises = [
  {
    icon: Store,
    title: "Independent sellers",
    text: "Every store is reviewed by our team before it opens.",
  },
  {
    icon: ShoppingBag,
    title: "One cart, many stores",
    text: "Buy from several sellers and pay once.",
  },
  {
    icon: BadgeCheck,
    title: "Clear prices in ETB",
    text: "Discounts are already included in the price you see.",
  },
];

/** Static content: it is part of the page shell, so it appears instantly. */
export function Hero() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Independent sellers, one checkout
        </p>
        <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
          Curated goods from people who make them well.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Shoes, bags, electronics and home goods from approved sellers across Ethiopia.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop?sort=newest" className={buttonVariants({ size: "lg" })}>
            Shop new arrivals
          </Link>
          <Link href="/become-seller" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Sell on Marketplace
          </Link>
        </div>

        <ul className="mt-14 grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
          {promises.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-medium text-ink">{title}</p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}