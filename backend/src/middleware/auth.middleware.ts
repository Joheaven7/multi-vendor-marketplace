import type { Request, RequestHandler } from "express";
import { User, type Role } from "../models/User";
import { AppError } from "../utils/AppError";
import { ACCESS_COOKIE } from "../utils/cookies";
import { verifyAccessToken } from "../utils/tokens";

/**
 * Requires a valid access token. The user is loaded from the database on every
 * request, so suspensions and role changes take effect immediately.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) throw AppError.unauthorized();

  const userId = verifyAccessToken(token);
  const user = await User.findById(userId).select("name email role status");

  if (!user) throw AppError.unauthorized("This account no longer exists");
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account has been suspended");
  }

  req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
  next();
};

/** Role-based access control. Use after `authenticate`. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };

/** Returns the authenticated user or throws. Use inside controllers instead of req.user!. */
export function getAuthUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}