import { api } from "@/lib/api-client";
import type { CategoryPageData, ListingResponse } from "./types";

export const storefrontApi = {
  list: (query: string) => api.get<ListingResponse>(`/products?${query}`),
  category: (slug: string) => api.get<CategoryPageData>(`/categories/${encodeURIComponent(slug)}`),
};