"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth/hooks";
import { adminSellersApi, sellersApi } from "./api";
import type { AdminSellerListParams } from "./types";

export const sellerKeys = {
  mine: ["sellers", "me"] as const,
  admin: ["admin", "sellers"] as const,
};

/** The signed-in user's own seller record (null if they have not applied). */
export function useMySeller() {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: sellerKeys.mine,
    queryFn: async () => (await sellersApi.getMine()).seller,
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useApplySeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sellersApi.apply,
    onSuccess: ({ seller }) => queryClient.setQueryData(sellerKeys.mine, seller),
  });
}

export function useAdminSellers(params: AdminSellerListParams) {
  return useQuery({
    queryKey: [...sellerKeys.admin, params],
    queryFn: () => adminSellersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSellerAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminSellersApi.act,
    // Refresh the list on success or failure (a 409 means someone else changed it first).
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerKeys.admin }),
  });
}