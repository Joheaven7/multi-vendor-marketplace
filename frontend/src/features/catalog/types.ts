import type { Pagination } from "@/features/sellers/types";

export type { Pagination };

export type ManagedImage = { url: string; publicId: string };

export type UploadedImage = ManagedImage & {
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export type UploadPurpose = "product" | "catalog";

/* ------------------------------ categories & brands ------------------------------ */

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image?: { url: string; publicId?: string };
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
};

export type CategoryInput = {
  name: string;
  parent?: string;
  image?: ManagedImage;
  sortOrder: number;
  isActive: boolean;
};

export type CategoryUpdateInput = {
  name: string;
  image: ManagedImage | null;
  sortOrder: number;
  isActive: boolean;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo?: { url: string; publicId?: string };
  isActive: boolean;
};

export type BrandInput = { name: string; logo?: ManagedImage; isActive: boolean };
export type BrandUpdateInput = { name: string; logo: ManagedImage | null; isActive: boolean };

/* --------------------------------- products --------------------------------- */

export type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "HIDDEN";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type Variant = {
  id: string;
  sku: string;
  optionValues: { name: string; value: string }[];
  price: number;
  finalPrice: number;
  stock: number;
  stockStatus: StockStatus;
};

export type Product = {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  images: ManagedImage[];
  specifications: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  discountPercent: number;
  lowStockThreshold: number;
  status: ProductStatus;
  moderationReason?: string;
  moderatedAt?: string;
  isSellerActive: boolean;
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
  /** Only present on detail requests. */
  variants?: Variant[];
};

export type AdminProduct = Product & {
  seller: { id: string; storeName: string; slug: string; status: string } | null;
};

export type ProductAction = "approve" | "reject" | "hide" | "unhide" | "delete";

export type AdminProductListParams = {
  status?: ProductStatus;
  search?: string;
  page: number;
  limit: number;
};