import { z } from "zod";

const ETHIOPIAN_PHONE = /^(?:\+251|251|0)[79]\d{8}$/;

const required = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const applicationSchema = z.object({
  storeName: required("Store name", 3, 60),
  description: z.string().trim().max(500, "Description must be at most 500 characters"),
  businessName: required("Business name", 2, 100),
  phone: z.string().trim().regex(ETHIOPIAN_PHONE, "Enter a valid Ethiopian phone number"),
  tinNumber: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{10}$/.test(value), "TIN must be 10 digits"),
  address: z.object({
    region: z.string().min(1, "Select a region"),
    city: required("City", 2, 60),
    subcity: z.string().trim().max(60, "Subcity must be at most 60 characters"),
    details: z.string().trim().max(200, "Details must be at most 200 characters"),
  }),
});

export type ApplicationValues = z.infer<typeof applicationSchema>;