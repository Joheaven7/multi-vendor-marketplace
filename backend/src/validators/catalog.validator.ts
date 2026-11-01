import { z } from "zod";
import { objectIdSchema } from "./common.validator";

const nameRule = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name must be at most 60 characters");

export const managedImageSchema = z.object({
  url: z.url("Invalid image URL").max(500),
  publicId: z.string().min(1).max(200),
});

const notEmpty = (data: object) => Object.keys(data).length > 0;

/* ------------------------------- categories ------------------------------- */

export const createCategorySchema = z.object({
  name: nameRule,
  parent: objectIdSchema.nullish(),
  image: managedImageSchema.optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

// The parent is fixed when a category is created.
export const updateCategorySchema = z
  .object({
    name: nameRule.optional(),
    image: managedImageSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(notEmpty, { message: "Nothing to update" });

/* --------------------------------- brands --------------------------------- */

export const createBrandSchema = z.object({
  name: nameRule,
  logo: managedImageSchema.optional(),
  isActive: z.boolean().optional(),
});

export const updateBrandSchema = z
  .object({
    name: nameRule.optional(),
    logo: managedImageSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(notEmpty, { message: "Nothing to update" });

export const uploadPurposeSchema = z.enum(["product", "catalog"]);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;