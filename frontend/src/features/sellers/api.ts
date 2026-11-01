import { api } from "@/lib/api-client";
import type {
  AdminSellerListParams,
  Pagination,
  Seller,
  SellerAction,
  SellerApplicationInput,
} from "./types";

export const sellersApi = {
  apply: (input: SellerApplicationInput) => api.post<{ seller: Seller }>("/sellers/apply", input),
  getMine: () => api.get<{ seller: Seller | null }>("/sellers/me"),
};

export const adminSellersApi = {
  list: (params: AdminSellerListParams) => {
    const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    return api.get<{ items: Seller[]; pagination: Pagination }>(`/admin/sellers?${query}`);
  },

  act: (input: { id: string; action: SellerAction; reason?: string }) =>
    api.patch<{ seller: Seller }>(
      `/admin/sellers/${input.id}/${input.action}`,
      input.reason ? { reason: input.reason } : undefined,
    ),
};