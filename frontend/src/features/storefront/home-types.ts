import type { ProductCardData } from "./types";

export type HomeData = {
  categories: { id: string; name: string; slug: string; image?: { url: string } }[];
  newArrivals: ProductCardData[];
  deals: ProductCardData[];
  popular: ProductCardData[];
  topStores: {
    id: string;
    storeName: string;
    slug: string;
    description?: string;
    logo?: { url: string };
    city: string;
    productCount: number;
  }[];
};