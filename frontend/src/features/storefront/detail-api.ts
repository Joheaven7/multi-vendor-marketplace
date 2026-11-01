import { api } from "@/lib/api-client";
import type { ProductDetail, StoreData } from "./detail-types";

export const detailApi = {
  product: (slug: string) => api.get<{ product: ProductDetail }>(`/products/${encodeURIComponent(slug)}`),
  store: (slug: string) => api.get<{ store: StoreData }>(`/stores/${encodeURIComponent(slug)}`),
};