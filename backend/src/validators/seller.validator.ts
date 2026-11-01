import { z } from "zod";
import { SELLER_STATUSES } from "../models/Seller";
import { phoneRule } from "./auth.validator";
import { paginationQuerySchema } from "./common.validator";

const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const sellerApplicationSchema = z.object({
  storeName: requiredText("Store name", 3, 60),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  businessName: requiredText("Business name", 2, 100),
  phone: phoneRule,
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "TIN must be 10 digits")
    .optional(),
  address: z.object({
    region: requiredText("Region", 2, 60),
    city: requiredText("City", 2, 60),
    subcity: z.string().trim().max(60).optional(),
    details: z.string().trim().max(200).optional(),
  }),
});

export const adminSellerListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(SELLER_STATUSES).optional(),
  search: z.string().trim().max(80).optional(),
});

export const reasonSchema = z.object({
  reason: requiredText("Reason", 5, 500),
});

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;
export type AdminSellerListQuery = z.infer<typeof adminSellerListQuerySchema>;