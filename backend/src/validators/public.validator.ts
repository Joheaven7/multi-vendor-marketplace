import { z } from "zod";
import { paginationQuerySchema } from "./common.validator";

/** Query strings often contain empty values (`?q=&minPrice=`). Treat them as "not set". */
const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalInt = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().min(min).max(max).optional());

const flag = z
  .preprocess(blankToUndefined, z.enum(["1", "true", "0", "false"]).optional())
  .transform((value) => value === "1" || value === "true");

const slugParam = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Invalid slug")
    .optional(),
);

/** `brand=nike,adidas` or `brand=nike&brand=adidas` (Express gives an array for the latter). */
const slugList = z.preprocess(
  (value) => (Array.isArray(value) ? value.join(",") : blankToUndefined(value)),
  z.string().trim().toLowerCase().max(300).optional(),
);

export const PRODUCT_SORTS = ["relevance", "newest", "price_asc", "price_desc", "rated", "popular"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const publicProductQuerySchema = paginationQuerySchema
  .extend({
    q: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
    category: slugParam,
    brand: slugList,
    seller: slugParam,
    minPrice: optionalInt(0, 100_000_000),
    maxPrice: optionalInt(0, 100_000_000),
    rating: z.preprocess(blankToUndefined, z.coerce.number().min(1).max(5).optional()),
    inStock: flag,
    discount: flag,
    sort: z.preprocess(blankToUndefined, z.enum(PRODUCT_SORTS).optional()),
  })
  .refine((data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice, {
    message: "The minimum price cannot be higher than the maximum price",
    path: ["minPrice"],
  });

export const slugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Invalid slug"),
});

export type PublicProductQuery = z.output<typeof publicProductQuerySchema>;