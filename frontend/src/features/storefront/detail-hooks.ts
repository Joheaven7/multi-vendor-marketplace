"use client";

import { useQuery } from "@tanstack/react-query";
import { detailApi } from "./detail-api";

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["storefront", "product", slug],
    queryFn: async () => (await detailApi.product(slug)).product,
  });
}

export function useStore(slug: string) {
  return useQuery({
    queryKey: ["storefront", "store", slug],
    queryFn: async () => (await detailApi.store(slug)).store,
    staleTime: 5 * 60 * 1000,
  });
}