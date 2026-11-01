"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { storefrontApi } from "./api";

/** `query` is the API query string, so each filter combination is cached separately. */
export function useProductListing(query: string) {
  return useQuery({
    queryKey: ["storefront", "products", query],
    queryFn: () => storefrontApi.list(query),
    // Keep showing the previous results (dimmed) while new ones load.
    placeholderData: keepPreviousData,
  });
}

export function useCategoryPage(slug: string) {
  return useQuery({
    queryKey: ["storefront", "category", slug],
    queryFn: () => storefrontApi.category(slug),
    staleTime: 5 * 60 * 1000,
  });
}