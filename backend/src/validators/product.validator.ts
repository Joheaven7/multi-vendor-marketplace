import { z } from "zod";
import { PRODUCT_STATUSES } from "../models/Product";
import { variantKey } from "../utils/variants";
import { managedImageSchema } from "./catalog.validator";
import { objectIdSchema, paginationQuerySchema } from "./common.validator";

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} character${min === 1 ? "" : "s"}`)
    .max(max, `${label} must be at most ${max} characters`);

const skuRule = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/, "SKU must be 3-40 characters: letters, numbers, - or _");

const optionSchema = z.object({
  name: text("Option name", 1, 30),
  values: z.array(text("Option value", 1, 30)).min(1, "Add at least one value").max(10),
});

const variantSchema = z.object({
  /** Present when editing an existing variant. */
  id: objectIdSchema.optional(),
  sku: skuRule,
  price: z
    .number()
    .int("Price must be a whole number of ETB")
    .min(1, "Price must be at least 1 ETB")
    .max(100_000_000),
  /** Required for new variants. Ignored for existing ones (stock changes via the inventory endpoint). */
  stock: z.number().int("Stock must be a whole number").min(0).max(1_000_000).optional(),
  /** e.g. { "Color": "Black", "Size": "M" }. Empty for products without options. */
  optionValues: z.record(z.string(), z.string()).default({}),
});

/** Used for both creating and editing: editing replaces the whole editable product. */
export const productSchema = z
  .object({
    name: text("Name", 3, 120),
    description: text("Description", 10, 5000),
    category: objectIdSchema,
    brand: objectIdSchema.nullish(),
    images: z.array(managedImageSchema).min(1, "Add at least one image").max(8, "At most 8 images"),
    specifications: z
      .array(z.object({ label: text("Label", 1, 50), value: text("Value", 1, 200) }))
      .max(20)
      .default([]),
    options: z.array(optionSchema).max(3, "At most 3 options").default([]),
    discountPercent: z.number().int().min(0).max(90).default(0),
    lowStockThreshold: z.number().int().min(0).max(1000).default(5),
    variants: z.array(variantSchema).min(1, "Add at least one variant").max(50),
  })
  .superRefine((data, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const publicIds = data.images.map((image) => image.publicId);
    if (new Set(publicIds).size !== publicIds.length) issue(["images"], "Duplicate images");

    const optionNames = data.options.map((option) => option.name.toLowerCase());
    if (new Set(optionNames).size !== optionNames.length) {
      issue(["options"], "Option names must be unique");
    }
    data.options.forEach((option, index) => {
      const values = option.values.map((value) => value.toLowerCase());
      if (new Set(values).size !== values.length) {
        issue(["options", index, "values"], "Option values must be unique");
      }
    });

    if (data.options.length === 0 && data.variants.length !== 1) {
      issue(["variants"], "A product without options has exactly one variant");
    }

    const skus = new Set<string>();
    const combinations = new Set<string>();

    data.variants.forEach((variant, index) => {
      const at = (field: string) => ["variants", index, field];
      const given = Object.entries(variant.optionValues);

      if (skus.has(variant.sku)) issue(at("sku"), "Duplicate SKU in this product");
      skus.add(variant.sku);

      if (!variant.id && variant.stock === undefined) {
        issue(at("stock"), "Stock is required for new variants");
      }

      if (data.options.length === 0) {
        if (given.length > 0) issue(at("optionValues"), "This product has no options");
      } else {
        for (const option of data.options) {
          const entry = given.find(([name]) => name.toLowerCase() === option.name.toLowerCase());
          if (!entry) {
            issue(at("optionValues"), `Choose a value for ${option.name}`);
          } else if (!option.values.some((v) => v.toLowerCase() === entry[1].toLowerCase())) {
            issue(at("optionValues"), `"${entry[1]}" is not a value of ${option.name}`);
          }
        }
        if (given.length > data.options.length) {
          issue(at("optionValues"), "Unknown option in variant");
        }
      }

      const key = variantKey(given.map(([name, value]) => ({ name, value })));
      if (combinations.has(key)) issue(at("optionValues"), "Duplicate combination of options");
      combinations.add(key);
    });
  });

const search = z.string().trim().max(80).optional();

export const sellerProductListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
  search,
});

export const adminProductListQuerySchema = sellerProductListQuerySchema.extend({
  sellerId: objectIdSchema.optional(),
});

export const inventoryQuerySchema = paginationQuerySchema.extend({
  stockStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
  search,
});

export const variantParamsSchema = z.object({ variantId: objectIdSchema });

export const stockSchema = z.object({
  stock: z.number().int("Stock must be a whole number").min(0).max(1_000_000),
});

export type ProductInput = z.output<typeof productSchema>;
export type SellerProductListQuery = z.output<typeof sellerProductListQuerySchema>;
export type AdminProductListQuery = z.output<typeof adminProductListQuerySchema>;
export type InventoryQuery = z.output<typeof inventoryQuerySchema>;