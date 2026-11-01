"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminBrandsApi, adminCategoriesApi, adminProductsApi, uploadsApi } from "./api";
import type {
  AdminProductListParams,
  BrandUpdateInput,
  CategoryUpdateInput,
  UploadPurpose,
} from "./types";

export const catalogKeys = {
  categories: ["admin", "categories"] as const,
  brands: ["admin", "brands"] as const,
  products: ["admin", "products"] as const,
};

export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: UploadPurpose }) =>
      (await uploadsApi.uploadImage(file, purpose)).image,
  });
}

/* -------------------------------- categories -------------------------------- */

export function useAdminCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: async () => (await adminCategoriesApi.list()).categories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCategoriesApi.create,
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      adminCategoriesApi.update(id, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCategoriesApi.remove,
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories }),
  });
}

/* --------------------------------- brands ---------------------------------- */

export function useAdminBrands() {
  return useQuery({
    queryKey: catalogKeys.brands,
    queryFn: async () => (await adminBrandsApi.list()).brands,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminBrandsApi.create,
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.brands }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrandUpdateInput }) =>
      adminBrandsApi.update(id, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.brands }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminBrandsApi.remove,
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.brands }),
  });
}

/* -------------------------------- products --------------------------------- */

export function useAdminProducts(params: AdminProductListParams) {
  return useQuery({
    queryKey: [...catalogKeys.products, "list", params],
    queryFn: () => adminProductsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string | null) {
  return useQuery({
    queryKey: [...catalogKeys.products, "detail", id],
    queryFn: async () => (await adminProductsApi.get(id as string)).product,
    enabled: !!id,
  });
}

export function useProductAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminProductsApi.act,
    // Refresh on success or failure (a 409 means someone else changed it first).
    onSettled: () => queryClient.invalidateQueries({ queryKey: catalogKeys.products }),
  });
}