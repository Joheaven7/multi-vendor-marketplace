import type { Category } from "@/features/catalog/types";
import type { Pagination } from "@/features/sellers/types";

export type { Category, Pagination };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  secondaryImage: string | null;
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  discountPercent: number;
  brand: { name: string; slug: string } | null;
  seller: { storeName: string; slug: string } | null;
  ratingAverage: number;
  ratingCount: number;
  inStock: boolean;
  hasOptions: boolean;
  isNew: boolean;
};

export type BrandFacet = { id: string; name: string; slug: string; count: number };

export type ListingFacets = {
  brands: BrandFacet[];
  priceRange: { min: number; max: number };
};

export type ListingResponse = {
  items: ProductCardData[];
  pagination: Pagination;
  facets: ListingFacets;
};

export type CategoryPageData = {
  category: Category;
  parent: Category | null;
  children: Category[];
};