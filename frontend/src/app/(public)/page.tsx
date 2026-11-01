import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero } from "@/features/storefront/components/home/hero";
import { HomeSections } from "@/features/storefront/components/home/home-sections";
import { HomeSkeleton } from "@/features/storefront/components/home/home-skeleton";
import { SellCta } from "@/features/storefront/components/home/sell-cta";

export const metadata: Metadata = {
  title: { absolute: "Marketplace · Curated goods from independent sellers" },
  description:
    "Shop shoes, bags, electronics and home goods from approved independent sellers across Ethiopia. One cart, one checkout.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeSections />
      </Suspense>
      <SellCta />
    </>
  );
}