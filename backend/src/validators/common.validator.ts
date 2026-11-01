import { z } from "zod";

/** A MongoDB ObjectId as a 24-character hex string. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const idParamsSchema = z.object({ id: objectIdSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});