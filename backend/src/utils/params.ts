import type { Request } from "express";

/** Reads the `:id` route parameter (validated as an ObjectId by the route's validator). */
export function getIdParam(req: Request): string {
  return (req.params as { id: string }).id;
}

/** Reads the `:slug` route parameter (validated by the route's validator). */
export function getSlugParam(req: Request): string {
  return (req.params as { slug: string }).slug;
}