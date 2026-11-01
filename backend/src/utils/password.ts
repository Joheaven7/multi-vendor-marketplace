import { compare, hash } from "bcryptjs";
import { env } from "../config/env";

// A low cost keeps the test suite fast. Production always uses 12.
const COST = env.NODE_ENV === "test" ? 4 : 12;

export const hashPassword = (password: string) => hash(password, COST);

export const verifyPassword = (password: string, passwordHash: string) =>
  compare(password, passwordHash);

let dummyHash: Promise<string> | undefined;

/**
 * Compared against when the email does not exist, so login takes about the same time
 * whether or not the account exists (prevents account enumeration by timing).
 */
export function getDummyHash(): Promise<string> {
  dummyHash ??= hash("not-a-real-password", COST);
  return dummyHash;
}