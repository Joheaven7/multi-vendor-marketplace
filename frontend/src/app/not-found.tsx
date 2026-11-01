import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Logo />
        <p className="mt-14 text-xs font-semibold uppercase tracking-[0.25em] text-accent">Error 404</p>
        <h1 className="mt-4 font-display text-4xl tracking-tight text-ink sm:text-5xl">
          This page could not be found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">
          The link may be wrong, or the page may have been moved. Let&apos;s get you back to the shop.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Go to the homepage
          </Link>
          <Link href="/shop" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Browse the shop
          </Link>
        </div>
      </div>
    </main>
  );
}