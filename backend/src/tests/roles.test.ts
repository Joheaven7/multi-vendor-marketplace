import request from "supertest";
import { describe, expect, it } from "vitest";
import { Seller } from "../models/Seller";
import { createAdminAgent, createUser, app, loginAs } from "./helpers";

const SOME_ID = "507f1f77bcf86cd799439011";

const adminRoutes = [
  ["get", "/api/admin/sellers"],
  ["get", `/api/admin/sellers/${SOME_ID}`],
  ["patch", `/api/admin/sellers/${SOME_ID}/approve`],
  ["patch", `/api/admin/sellers/${SOME_ID}/reject`],
  ["patch", `/api/admin/sellers/${SOME_ID}/suspend`],
  ["patch", `/api/admin/sellers/${SOME_ID}/reactivate`],
    ["get", "/api/admin/products"],
  ["get", `/api/admin/products/${SOME_ID}`],
  ["patch", `/api/admin/products/${SOME_ID}/approve`],
  ["patch", `/api/admin/products/${SOME_ID}/reject`],
  ["patch", `/api/admin/products/${SOME_ID}/hide`],
  ["patch", `/api/admin/products/${SOME_ID}/unhide`],
  ["delete", `/api/admin/products/${SOME_ID}`],
  ["get", "/api/admin/categories"],
  ["get", "/api/admin/brands"],
] as const;

describe.each(adminRoutes)("%s %s", (method, path) => {
  it("rejects anonymous callers with 401", async () => {
    await request(app)[method](path).expect(401);
  });

  it("rejects customers with 403", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const agent = await loginAs(customer.email);
    await agent[method](path).send({ reason: "Testing access" }).expect(403);
  });

  it("rejects sellers with 403", async () => {
    const seller = await createUser({ role: "SELLER" });
    const agent = await loginAs(seller.email);
    await agent[method](path).send({ reason: "Testing access" }).expect(403);
  });

  it("lets admins through the role check", async () => {
    const admin = await createAdminAgent();
    const res = await admin[method](path).send({ reason: "Testing access" });
    expect([401, 403]).not.toContain(res.status);
  });
});

describe("seller endpoints", () => {
  const application = {
    storeName: "Abebe Electronics",
    businessName: "Abebe Trading PLC",
    phone: "0911223344",
    address: { region: "Oromia", city: "Jimma" },
  };

  it("require a signed-in user", async () => {
    await request(app).get("/api/sellers/me").expect(401);
    await request(app).post("/api/sellers/apply").send(application).expect(401);
  });

  it("show each user only their own seller record", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const aliceAgent = await loginAs(alice.email);
    const bobAgent = await loginAs(bob.email);

    await aliceAgent.post("/api/sellers/apply").send({ ...application, storeName: "Alice Store" }).expect(201);
    await bobAgent.post("/api/sellers/apply").send({ ...application, storeName: "Bob Store" }).expect(201);

    const aliceView = await aliceAgent.get("/api/sellers/me").expect(200);
    const bobView = await bobAgent.get("/api/sellers/me").expect(200);

    expect(aliceView.body.data.seller.storeName).toBe("Alice Store");
    expect(bobView.body.data.seller.storeName).toBe("Bob Store");
  });

  it("take the owner from the session, never from the request body", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const aliceAgent = await loginAs(alice.email);

    await aliceAgent
      .post("/api/sellers/apply")
      .send({ ...application, user: bob.id, status: "ACTIVE" })
      .expect(201);

    const seller = await Seller.findOne({ storeName: application.storeName });
    expect(seller?.user.toString()).toBe(alice.id);
    expect(seller?.status).toBe("PENDING");
  });

  it("do not let an admin account apply to sell", async () => {
    const admin = await createAdminAgent();
    await admin.post("/api/sellers/apply").send(application).expect(403);
  });

  it("show no seller record to a user who has not applied", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);
    const res = await agent.get("/api/sellers/me").expect(200);
    expect(res.body.data.seller).toBeNull();
  });
});