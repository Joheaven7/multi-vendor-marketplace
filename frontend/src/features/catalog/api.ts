import { api } from "@/lib/api-client";
import type {
  AdminProduct,
  AdminProductListParams,
  Brand,
  BrandInput,
  BrandUpdateInput,
  Category,
  CategoryInput,
  CategoryUpdateInput,
  Pagination,
  ProductAction,
  UploadPurpose,
  UploadedImage,
} from "./types";

export const uploadsApi = {
  uploadImage: (file: File, purpose: UploadPurpose) => {
    const form = new FormData();
    form.append("purpose", purpose);
    form.append("file", file);
    return api.post<{ image: UploadedImage }>("/uploads/images", form);
  },
};

export const adminCategoriesApi = {
  list: () => api.get<{ categories: Category[] }>("/admin/categories"),
  create: (input: CategoryInput) => api.post<{ category: Category }>("/admin/categories", input),
  update: (id: string, input: CategoryUpdateInput) =>
    api.put<{ category: Category }>(`/admin/categories/${id}`, input),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/categories/${id}`),
};

export const adminBrandsApi = {
  list: () => api.get<{ brands: Brand[] }>("/admin/brands"),
  create: (input: BrandInput) => api.post<{ brand: Brand }>("/admin/brands", input),
  update: (id: string, input: BrandUpdateInput) => api.put<{ brand: Brand }>(`/admin/brands/${id}`, input),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/brands/${id}`),
};

export const adminProductsApi = {
  list: (params: AdminProductListParams) => {
    const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    return api.get<{ items: AdminProduct[]; pagination: Pagination }>(`/admin/products?${query}`);
  },

  get: (id: string) => api.get<{ product: AdminProduct }>(`/admin/products/${id}`),

  act: (input: { id: string; action: ProductAction; reason?: string }): Promise<unknown> =>
    input.action === "delete"
      ? api.delete(`/admin/products/${input.id}`)
      : api.patch(`/admin/products/${input.id}/${input.action}`, input.reason ? { reason: input.reason } : undefined),
};