import { api } from "@/lib/api-client";
import type { Brand, Category } from "@/features/catalog/types";
import type {
  InventoryItem,
  InventoryListParams,
  Pagination,
  Product,
  ProductInput,
  SellerProductListParams,
} from "./types";

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

export const sellerProductsApi = {
  list: (params: SellerProductListParams) =>
    api.get<{ items: Product[]; pagination: Pagination }>(`/seller/products?${toQuery({ ...params })}`),

  get: (id: string) => api.get<{ product: Product }>(`/seller/products/${id}`),

  create: (input: ProductInput) => api.post<{ product: Product }>("/seller/products", input),

  update: (id: string, input: ProductInput) =>
    api.put<{ product: Product }>(`/seller/products/${id}`, input),

  remove: (id: string) => api.delete<{ message: string }>(`/seller/products/${id}`),

  submit: (id: string) => api.post<{ product: Product }>(`/seller/products/${id}/submit`),

  withdraw: (id: string) => api.post<{ product: Product }>(`/seller/products/${id}/withdraw`),
};

export const sellerInventoryApi = {
  list: (params: InventoryListParams) =>
    api.get<{ items: InventoryItem[]; pagination: Pagination }>(`/seller/inventory?${toQuery({ ...params })}`),

  setStock: (variantId: string, stock: number) =>
    api.patch<{ item: { id: string; sku: string; stock: number } }>(`/seller/inventory/${variantId}`, {
      stock,
    }),
};

/** Public lists used to fill the category and brand selects. */
export const publicCatalogApi = {
  categories: () => api.get<{ categories: Category[] }>("/categories"),
  brands: () => api.get<{ brands: Brand[] }>("/brands"),
};