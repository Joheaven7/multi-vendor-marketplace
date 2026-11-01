import { createHash, randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./AppError";

const UNITS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/** Converts "15m", "7d", "30s", "2h" to seconds. */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration "${value}". Use values like 15m, 12h or 7d.`);
  return Number(match[1]) * UNITS[match[2] as keyof typeof UNITS];
}

export const ACCESS_TTL_SECONDS = durationToSeconds(env.JWT_ACCESS_EXPIRES);
export const REFRESH_TTL_SECONDS = durationToSeconds(env.JWT_REFRESH_EXPIRES);

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: ACCESS_TTL_SECONDS,
    algorithm: "HS256",
  });
}

/** Each refresh token has a unique id, so rotating always produces a different token. */
export function signRefreshToken(userId: string): string {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: randomUUID(),
    expiresIn: REFRESH_TTL_SECONDS,
    algorithm: "HS256",
  });
}

function verify(token: string, secret: string): string {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload === "string" || !payload.sub) throw new Error("Malformed token");
    return payload.sub;
  } catch {
    throw AppError.unauthorized("Invalid or expired session");
  }
}

/** Returns the user id stored in the token. */
export const verifyAccessToken = (token: string) => verify(token, env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (token: string) => verify(token, env.JWT_REFRESH_SECRET);

/** Refresh tokens are stored hashed, so a database leak cannot be used to hijack sessions. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");