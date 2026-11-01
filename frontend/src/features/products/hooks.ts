"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { publicCatalogApi, sellerInventoryApi, sellerProductsApi } from "./api";
import type { InventoryListParams, ProductInput, SellerProductListParams } from "./types";

export const sellerCatalogKeys = {
  all: ["seller", "catalog"] as const,
  products: ["seller", "catalog", "products"] as const,
  inventory: ["seller", "catalog", "inventory"] as const,
};

export function useSellerProducts(params: SellerProductListParams) {
  return useQuery({
    queryKey: [...sellerCatalogKeys.products, "list", params],
    queryFn: () => sellerProductsApi.list(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useSellerProduct(id: string) {
  return useQuery({
    queryKey: [...sellerCatalogKeys.products, "detail", id],
    queryFn: async () => (await sellerProductsApi.get(id)).product,
    retry: false,
  });
}

/** Creates a product, or updates it when an id is given. Stock totals change too, so refresh both lists. */
export function useSaveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ProductInput }) =>
      (id ? await sellerProductsApi.update(id, input) : await sellerProductsApi.create(input)).product,
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerCatalogKeys.all }),
  });
}

export function useSubmitProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sellerProductsApi.submit,
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerCatalogKeys.all }),
  });
}

export function useWithdrawProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sellerProductsApi.withdraw,
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerCatalogKeys.all }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sellerProductsApi.remove,
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerCatalogKeys.all }),
  });
}

export function useInventory(params: InventoryListParams) {
  return useQuery({
    queryKey: [...sellerCatalogKeys.inventory, params],
    queryFn: () => sellerInventoryApi.list(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useSetStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, stock }: { variantId: string; stock: number }) =>
      sellerInventoryApi.setStock(variantId, stock),
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerCatalogKeys.all }),
  });
}

export function usePublicCategories() {
  return useQuery({
    queryKey: ["catalog", "categories"],
    queryFn: async () => (await publicCatalogApi.categories()).categories,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicBrands() {
  return useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: async () => (await publicCatalogApi.brands()).brands,
    staleTime: 5 * 60 * 1000,
  });
}