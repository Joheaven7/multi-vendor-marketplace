import request from "supertest";
import type { Response } from "supertest";
import { createApp } from "../app";
import { Seller, type SellerStatus } from "../models/Seller";
import { User, type Role, type UserStatus } from "../models/User";
import { hashPassword } from "../utils/password";

export const app = createApp();

export const PASSWORD = "Passw0rdOK";

export type Agent = ReturnType<typeof request.agent>;

let sequence = 0;

export async function createUser(
  overrides: Partial<{ name: string; email: string; role: Role; status: UserStatus }> = {},
) {
  sequence += 1;
  return User.create({
    name: "Test User",
    email: `user${sequence}@example.com`,
    passwordHash: await hashPassword(PASSWORD),
    role: "CUSTOMER",
    ...overrides,
  });
}

/** Returns a client that keeps the session cookies, like a browser. */
export async function loginAs(email: string): Promise<Agent> {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return agent;
}

export async function createAdminAgent(): Promise<Agent> {
  const admin = await createUser({ name: "Admin", role: "ADMIN" });
  return loginAs(admin.email);
}

/**
 * Creates a user with a seller record directly in the database (no HTTP).
 * ACTIVE and SUSPENDED sellers get the SELLER role, like in the real approval flow.
 */
export async function createSellerUser(status: SellerStatus = "ACTIVE") {
  const hasSellerRole = status === "ACTIVE" || status === "SUSPENDED";
  const user = await createUser({ role: hasSellerRole ? "SELLER" : "CUSTOMER" });
  const seller = await Seller.create({
    user: user._id,
    storeName: `Store ${sequence}`,
    slug: `store-${sequence}`,
    businessName: "Test Trading PLC",
    phone: "0911223344",
    address: { region: "Oromia", city: "Jimma" },
    status,
  });
  return { user, seller };
}

/** Reads one cookie's value out of a response's Set-Cookie headers. */
export function getCookie(res: Response, name: string): string | undefined {
  const raw = res.headers["set-cookie"] as unknown as string[] | string | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const entry = list.find((cookie) => cookie.startsWith(`${name}=`));
  return entry?.split(";")[0].slice(name.length + 1);
}