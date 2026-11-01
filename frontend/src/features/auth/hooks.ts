"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { authApi } from "./api";
import type { User } from "./types";
import { getHomePath, safeNextPath } from "./utils";

export const authKeys = { me: ["auth", "me"] as const };

/** The signed-in user, or null when signed out. `undefined` while loading. */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return (await authApi.me()).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => queryClient.setQueryData(authKeys.me, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user }) => queryClient.setQueryData(authKeys.me, user),
  });
}

/** Clears every cached query so the next user never sees the previous user's data. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: ({ user }) => queryClient.setQueryData(authKeys.me, user),
  });
}

/** The server signs the user out everywhere after a password change. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}

/** For login/register pages: send signed-in users on to where they were going. */
export function useRedirectIfAuthenticated(next?: string | null) {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (user) router.replace(safeNextPath(next) ?? getHomePath(user.role));
  }, [user, next, router]);

  return user;
}