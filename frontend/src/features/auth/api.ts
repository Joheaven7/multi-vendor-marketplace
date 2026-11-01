import { api } from "@/lib/api-client";
import type { User } from "./types";

export const authApi = {
  register: (input: { name: string; email: string; password: string; phone?: string }) =>
    api.post<{ user: User }>("/auth/register", input),

  login: (input: { email: string; password: string }) => api.post<{ user: User }>("/auth/login", input),

  logout: () => api.post<{ message: string }>("/auth/logout"),

  me: () => api.get<{ user: User }>("/auth/me"),

  updateProfile: (input: { name?: string; phone?: string | null }) =>
    api.patch<{ user: User }>("/users/me", input),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.patch<{ message: string }>("/users/me/password", input),
};