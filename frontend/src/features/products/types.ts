import type {
  ManagedImage,
  Pagination,
  Product,
  ProductStatus,
  StockStatus,
} from "@/features/catalog/types";

export type { ManagedImage, Pagination, Product, ProductStatus, StockStatus };

export type ProductVariantInput = {
  /** Present when editing an existing variant. */
  id?: string;
  sku: string;
  price: number;
  /** Only sent for new variants. Existing stock changes through the inventory page. */
  stock?: number;
  optionValues: Record<string, string>;
};

export type ProductInput = {
  name: string;
  description: string;
  category: string;
  brand: string | null;
  images: ManagedImage[];
  specifications: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  discountPercent: number;
  lowStockThreshold: number;
  variants: ProductVariantInput[];
};

export type SellerProductListParams = {
  status?: ProductStatus;
  search?: string;
  page: number;
  limit: number;
};

export type InventoryItem = {
  id: string;
  sku: string;
  optionValues: { name: string; value: string }[];
  stock: number;
  stockStatus: StockStatus;
  lowStockThreshold: number;
  product: { id: string; name: string; slug: string; status: string; image?: string };
};

export type InventoryListParams = {
  stockStatus?: StockStatus;
  search?: string;
  page: number;
  limit: number;
};