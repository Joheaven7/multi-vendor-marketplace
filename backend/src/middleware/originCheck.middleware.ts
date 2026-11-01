import type { RequestHandler } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const allowedOrigin = new URL(env.CLIENT_URL).origin;

/**
 * CSRF defence for cookie auth: browsers always send an Origin header on
 * state-changing requests. If it is present and is not our frontend, reject.
 * Requests without Origin (Postman, server-to-server) are allowed.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && origin !== allowedOrigin) {
    throw AppError.forbidden("Request origin is not allowed");
  }
  next();
};