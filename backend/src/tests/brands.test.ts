import request from "supertest";
import { describe, expect, it } from "vitest";
import { Brand } from "../models/Brand";
import { createAdminAgent, createUser, app, loginAs } from "./helpers";
import { fakeStorage } from "./fake-storage";

const logo = fakeStorage.ref("marketplace/catalog", "nike");

describe("public GET /api/brands", () => {
  it("lists active brands alphabetically", async () => {
    await Brand.create({ name: "Zara", slug: "zara" });
    await Brand.create({ name: "adidas", slug: "adidas" });
    await Brand.create({ name: "Retired", slug: "retired", isActive: false });

    const res = await request(app).get("/api/brands").expect(200);
    expect(res.body.data.brands.map((b: { name: string }) => b.name)).toEqual(["adidas", "Zara"]);
  });
});

describe("admin brands", () => {
  it("requires an admin", async () => {
    await request(app).post("/api/admin/brands").send({ name: "Nike" }).expect(401);

    const customer = await createUser();
    const agent = await loginAs(customer.email);
    await agent.post("/api/admin/brands").send({ name: "Nike" }).expect(403);
  });

  it("creates, updates and deletes a brand", async () => {
    const admin = await createAdminAgent();

    const created = await admin.post("/api/admin/brands").send({ name: "Nike", logo }).expect(201);
    expect(created.body.data.brand).toMatchObject({ name: "Nike", slug: "nike", isActive: true });

    const id = created.body.data.brand.id;
    const updated = await admin.put(`/api/admin/brands/${id}`).send({ isActive: false }).expect(200);
    expect(updated.body.data.brand.isActive).toBe(false);

    await admin.delete(`/api/admin/brands/${id}`).expect(200);
    expect(fakeStorage.deleted).toContain(logo.publicId);
    expect(await Brand.countDocuments()).toBe(0);
  });

  it("rejects duplicate names in any case", async () => {
    const admin = await createAdminAgent();
    await admin.post("/api/admin/brands").send({ name: "Nike" }).expect(201);
    await admin.post("/api/admin/brands").send({ name: "NIKE" }).expect(409);
  });

  it("validates input and logo ownership", async () => {
    const admin = await createAdminAgent();

    await admin.post("/api/admin/brands").send({ name: "N" }).expect(400);
    await admin
      .post("/api/admin/brands")
      .send({ name: "Fake Logo", logo: { url: "https://evil.example/x.jpg", publicId: "marketplace/catalog/x" } })
      .expect(400);
  });

  it("returns 404 for an unknown brand", async () => {
    const admin = await createAdminAgent();
    await admin.delete("/api/admin/brands/507f1f77bcf86cd799439011").expect(404);
  });
});