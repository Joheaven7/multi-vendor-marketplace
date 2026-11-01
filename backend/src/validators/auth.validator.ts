import { z } from "zod";

const emailRule = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const nameRule = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters");

/** Ethiopian mobile numbers: +2519XXXXXXXX, 2519XXXXXXXX, 09XXXXXXXX, 07XXXXXXXX */
export const phoneRule = z
  .string()
  .trim()
  .regex(/^(?:\+251|251|0)[79]\d{8}$/, "Enter a valid Ethiopian phone number");

export const registerSchema = z.object({
  name: nameRule,
  email: emailRule,
  password: passwordRule,
  phone: phoneRule.optional(),
});

export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z
  .object({
    name: nameRule.optional(),
    phone: phoneRule.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRule,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;