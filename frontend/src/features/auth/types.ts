export type Role = "CUSTOMER" | "SELLER" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  avatar?: string;
  createdAt: string;
};