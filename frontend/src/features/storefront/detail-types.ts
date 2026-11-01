import type { ProductCardData } from "./types";

export type PublicVariant = {
  id: string;
  optionValues: { name: string; value: string }[];
  price: number;
  finalPrice: number;
  inStock: boolean;
  /** How many can be ordered at once (the stock, capped at 10). */
  maxQuantity: number;
  /** Set only when stock is running low. */
  stockLeft?: number;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: { url: string }[];
  specifications: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  discountPercent: number;
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  ratingAverage: number;
  ratingCount: number;
  brand: { name: string; slug: string } | null;
  seller: { storeName: string; slug: string; city: string; region: string };
  /** From the top-level category down to the product's own category. */
  categoryTrail: { name: string; slug: string }[];
  variants: PublicVariant[];
  related: ProductCardData[];
  createdAt: string;
};

export type StoreData = {
  id: string;
  storeName: string;
  slug: string;
  description?: string;
  logo?: { url: string };
  city: string;
  region: string;
  sellingSince: string;
  productCount: number;
};