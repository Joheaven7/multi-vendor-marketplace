import type { Request, RequestHandler } from "express";
import { Seller } from "../models/Seller";
import { AppError } from "../utils/AppError";
import { getAuthUser } from "./auth.middleware";

/**
 * Loads the caller's seller record and requires it to be ACTIVE. The seller id always
 * comes from the signed-in user, never from the URL or body, which is what makes
 * "Seller A can never touch Seller B's data" true.
 */
export const requireActiveSeller: RequestHandler = async (req, _res, next) => {
  const user = getAuthUser(req);
  const seller = await Seller.findOne({ user: user.id }).select("status");

  if (!seller || seller.status !== "ACTIVE") {
    throw new AppError(403, "SELLER_NOT_ACTIVE", "Your seller account is not active");
  }

  req.seller = { id: seller.id };
  next();
};

export function getSellerContext(req: Request): { id: string } {
  if (!req.seller) throw AppError.forbidden();
  return req.seller;
}