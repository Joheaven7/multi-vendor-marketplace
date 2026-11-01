import { describe, expect, it } from "vitest";
import { Seller } from "../models/Seller";
import { User } from "../models/User";
import { createAdminAgent, createUser, loginAs } from "./helpers";

const application = {
  storeName: "Abebe Electronics",
  businessName: "Abebe Trading PLC",
  phone: "0911223344",
  description: "Phones and accessories in Jimma.",
  address: { region: "Oromia", city: "Jimma", subcity: "Hirmata" },
};

/** Creates a customer who has submitted a seller application. */
async function applyAsCustomer(overrides: Partial<typeof application> = {}) {
  const user = await createUser();
  const agent = await loginAs(user.email);
  const res = await agent
    .post("/api/sellers/apply")
    .send({ ...application, ...overrides })
    .expect(201);
  return { user, agent, seller: res.body.data.seller as { id: string; slug: string; status: string } };
}

describe("applying", () => {
  it("creates a PENDING application with a slug", async () => {
    const { seller } = await applyAsCustomer();

    expect(seller.status).toBe("PENDING");
    expect(seller.slug).toBe("abebe-electronics");
  });

  it("gives colliding store names unique slugs", async () => {
    const first = await applyAsCustomer();
    const second = await applyAsCustomer();

    expect(first.seller.slug).toBe("abebe-electronics");
    expect(second.seller.slug).toBe("abebe-electronics-2");
  });

  it("validates the application", async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    const res = await agent
      .post("/api/sellers/apply")
      .send({ ...application, phone: "12345", storeName: "ab" })
      .expect(400);

    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["phone", "storeName"]));
  });

  it("does not allow a second application while one exists", async () => {
    const { agent } = await applyAsCustomer();
    const res = await agent.post("/api/sellers/apply").send(application).expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("approval", () => {
  it("activates the seller and grants the SELLER role immediately", async () => {
    const { user, agent, seller } = await applyAsCustomer();
    const admin = await createAdminAgent();

    const res = await admin.patch(`/api/admin/sellers/${seller.id}/approve`).expect(200);
    expect(res.body.data.seller.status).toBe("ACTIVE");

    const savedUser = await User.findById(user.id);
    expect(savedUser?.role).toBe("SELLER");

    const savedSeller = await Seller.findById(seller.id);
    expect(savedSeller?.reviewedBy).toBeDefined();
    expect(savedSeller?.reviewedAt).toBeInstanceOf(Date);

    // The same browser session sees the new role without signing in again.
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.data.user.role).toBe("SELLER");
  });

  it("cannot approve twice", async () => {
    const { seller } = await applyAsCustomer();
    const admin = await createAdminAgent();

    await admin.patch(`/api/admin/sellers/${seller.id}/approve`).expect(200);
    const res = await admin.patch(`/api/admin/sellers/${seller.id}/approve`).expect(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });
});

describe("rejection and re-applying", () => {
  it("requires a reason", async () => {
    const { seller } = await applyAsCustomer();
    const admin = await createAdminAgent();

    await admin.patch(`/api/admin/sellers/${seller.id}/reject`).send({}).expect(400);
    await admin.patch(`/api/admin/sellers/${seller.id}/reject`).send({ reason: "no" }).expect(400);
  });

  it("rejects with a reason the applicant can see, without granting a role", async () => {
    const { user, agent, seller } = await applyAsCustomer();
    const admin = await createAdminAgent();

    await admin
      .patch(`/api/admin/sellers/${seller.id}/reject`)
      .send({ reason: "Missing business information" })
      .expect(200);

    const mine = await agent.get("/api/sellers/me").expect(200);
    expect(mine.body.data.seller).toMatchObject({
      status: "REJECTED",
      rejectionReason: "Missing business information",
    });

    const savedUser = await User.findById(user.id);
    expect(savedUser?.role).toBe("CUSTOMER");
  });

  it("lets a rejected applicant fix the details and re-apply", async () => {
    const { agent, seller } = await applyAsCustomer();
    const admin = await createAdminAgent();
    await admin
      .patch(`/api/admin/sellers/${seller.id}/reject`)
      .send({ reason: "Missing business information" })
      .expect(200);

    const res = await agent
      .post("/api/sellers/apply")
      .send({ ...application, storeName: "Abebe Electronics Jimma" })
      .expect(201);

    expect(res.body.data.seller.status).toBe("PENDING");
    expect(res.body.data.seller.rejectionReason).toBeUndefined();
    expect(res.body.data.seller.slug).toBe("abebe-electronics-jimma");
    expect(await Seller.countDocuments()).toBe(1);
  });
});

describe("status transitions", () => {
  it("rejects invalid transitions", async () => {
    const { seller } = await applyAsCustomer();
    const admin = await createAdminAgent();

    // PENDING cannot be suspended or reactivated.
    await admin.patch(`/api/admin/sellers/${seller.id}/suspend`).send({ reason: "Not allowed yet" }).expect(409);
    await admin.patch(`/api/admin/sellers/${seller.id}/reactivate`).expect(409);

    // ACTIVE cannot be rejected.
    await admin.patch(`/api/admin/sellers/${seller.id}/approve`).expect(200);
    await admin.patch(`/api/admin/sellers/${seller.id}/reject`).send({ reason: "Too late now" }).expect(409);
  });

  it("cannot approve a rejected application directly", async () => {
    const { seller } = await applyAsCustomer();
    const admin = await createAdminAgent();

    await admin.patch(`/api/admin/sellers/${seller.id}/reject`).send({ reason: "Incomplete application" }).expect(200);
    await admin.patch(`/api/admin/sellers/${seller.id}/approve`).expect(409);
  });

  it("suspends with a reason, keeps the role, and reactivates", async () => {
    const { user, seller } = await applyAsCustomer();
    const admin = await createAdminAgent();
    await admin.patch(`/api/admin/sellers/${seller.id}/approve`).expect(200);

    const suspended = await admin
      .patch(`/api/admin/sellers/${seller.id}/suspend`)
      .send({ reason: "Policy violation" })
      .expect(200);
    expect(suspended.body.data.seller).toMatchObject({
      status: "SUSPENDED",
      suspensionReason: "Policy violation",
    });
    expect((await User.findById(user.id))?.role).toBe("SELLER");

    const reactivated = await admin.patch(`/api/admin/sellers/${seller.id}/reactivate`).expect(200);
    expect(reactivated.body.data.seller.status).toBe("ACTIVE");
    expect(reactivated.body.data.seller.suspensionReason).toBeUndefined();
  });

  it("returns 404 for an unknown seller and 400 for a malformed id", async () => {
    const admin = await createAdminAgent();

    await admin.patch("/api/admin/sellers/507f1f77bcf86cd799439011/approve").expect(404);
    await admin.patch("/api/admin/sellers/not-an-id/approve").expect(400);
    await admin.get("/api/admin/sellers/not-an-id").expect(400);
  });
});

describe("GET /api/admin/sellers", () => {
  it("filters by status and includes owner details", async () => {
    const pending = await applyAsCustomer({ storeName: "Pending Shop" });
    const toApprove = await applyAsCustomer({ storeName: "Approved Shop" });
    const admin = await createAdminAgent();
    await admin.patch(`/api/admin/sellers/${toApprove.seller.id}/approve`).expect(200);

    const res = await admin.get("/api/admin/sellers?status=PENDING").expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ storeName: "Pending Shop" });
    expect(res.body.data.items[0].owner.email).toBe(pending.user.email);
  });

  it("paginates", async () => {
    for (let i = 1; i <= 3; i += 1) await applyAsCustomer({ storeName: `Shop Number ${i}` });
    const admin = await createAdminAgent();

    const page2 = await admin.get("/api/admin/sellers?limit=2&page=2").expect(200);
    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it("searches by store name and rejects invalid query values", async () => {
    await applyAsCustomer({ storeName: "Coffee House" });
    await applyAsCustomer({ storeName: "Phone World" });
    const admin = await createAdminAgent();

    const res = await admin.get("/api/admin/sellers?search=coffee").expect(200);
    expect(res.body.data.items).toHaveLength(1);

    await admin.get("/api/admin/sellers?status=NOPE").expect(400);
    await admin.get("/api/admin/sellers?limit=500").expect(400);
  });
});