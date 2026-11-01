import type { CookieOptions, Response } from "express";
import { isProduction } from "../config/env";
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from "./tokens";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

const ACCESS_PATH = "/";
// The refresh cookie is only sent to the auth endpoints, never with normal API calls.
const REFRESH_PATH = "/api/auth";

const base: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    path: ACCESS_PATH,
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...base, path: ACCESS_PATH });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}