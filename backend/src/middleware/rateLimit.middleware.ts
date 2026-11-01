import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const message = {
  success: false,
  error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." },
};

const shared = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message,
  // Tests sign in dozens of times from one address.
  skip: () => env.NODE_ENV === "test",
};

/** General limiter for the whole API. */
export const apiLimiter = rateLimit({ ...shared, limit: 500 });

/** Strict limiter for login and register. */
export const authLimiter = rateLimit({ ...shared, limit: 20 });