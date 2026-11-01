import request from "supertest";
import { describe, expect, it } from "vitest";
import { Category } from "../models/Category";
import { createAdminAgent, createUser, app, loginAs } from "./helpers";
import { fakeStorage } from "./fake-storage";

const catalogImage = fakeStorage.ref("marketplace/catalog", "men");

async function createCategory(admin: Awaited<ReturnType<typeof createAdminAgent>>, body: object) {
  const res = await admin.post("/api/admin/categories").send(body).expect(201);
  return res.body.data.category as { id: string; slug: string; name: string };
}

describe("public GET /api/categories", () => {
  it("returns active categories as a tree and hides internal fields", async () => {
    const men = await Category.create({ name: "Men", slug: "men", image: catalogImage });
    await Category.create({ name: "Shoes", slug: "shoes", parent: men._id });
    await Category.create({ name: "Old Stock", slug: "old-stock", parent: men._id, isActive: false });

    const hidden = await Category.create({ name: "Hidden", slug: "hidden", isActive: false });
    await Category.create({ name: "Under Hidden", slug: "under-hidden", parent: hidden._id });

    const res = await request(app).get("/api/categories").expect(200);
    const tree = res.body.data.categories;

    expect(tree.map((c: { name: string }) => c.name)).toEqual(["Men"]);
    expect(tree[0].children.map((c: { name: string }) => c.name)).toEqual(["Shoes"]);
    expect(tree[0].image.url).toBe(catalogImage.url);
    expect(tree[0].image.publicId).toBeUndefined();
  });
});

describe("admin categories", () => {
  it("requires an admin", async () => {
    await request(app).get("/api/admin/categories").expect(401);

    const customer = await createUser();
    const agent = await loginAs(customer.email);
    await agent.get("/api/admin/categories").expect(403);
    await agent.post("/api/admin/categories").send({ name: "Nope" }).expect(403);
  });

  it("creates top-level and child categories, and lists inactive ones for admins", async () => {
    const admin = await createAdminAgent();
    const men = await createCategory(admin, { name: "Men" });
    await createCategory(admin, { name: "Shoes", parent: men.id });
    await createCategory(admin, { name: "Seasonal", isActive: false });

    const res = await admin.get("/api/admin/categories").expect(200);
    const tree = res.body.data.categories;

    expect(tree.map((c: { name: string }) => c.name).sort()).toEqual(["Men", "Seasonal"]);
    const menNode = tree.find((c: { name: string }) => c.name === "Men");
    expect(menNode.children[0]).toMatchObject({ name: "Shoes", parentId: men.id });
  });

  it("does not allow a third level", async () => {
    const admin = await createAdminAgent();
    const men = await createCategory(admin, { name: "Men" });
    const shoes = await createCategory(admin, { name: "Shoes", parent: men.id });

    const res = await admin
      .post("/api/admin/categories")
      .send({ name: "Sneakers", parent: shoes.id })
      .expect(400);
    expect(res.body.error.message).toMatch(/two levels/i);
  });

  it("rejects duplicate names among siblings (any case) but allows them under other parents", async () => {
    const admin = await createAdminAgent();
    const men = await createCategory(admin, { name: "Men" });
    const women = await createCategory(admin, { name: "Women" });

    await createCategory(admin, { name: "Accessories", parent: men.id });
    await admin
      .post("/api/admin/categories")
      .send({ name: "ACCESSORIES", parent: men.id })
      .expect(409);

    const other = await createCategory(admin, { name: "Accessories", parent: women.id });
    expect(other.slug).toBe("accessories-2");
  });

  it("validates input and unknown parents", async () => {
    const admin = await createAdminAgent();

    await admin.post("/api/admin/categories").send({ name: "A" }).expect(400);
    await admin
      .post("/api/admin/categories")
      .send({ name: "Orphan", parent: "507f1f77bcf86cd799439011" })
      .expect(404);
    await admin.put("/api/admin/categories/not-an-id").send({ name: "Valid Name" }).expect(400);
  });

  it("renames without changing the slug, and can disable a category", async () => {
    const admin = await createAdminAgent();
    const created = await createCategory(admin, { name: "Shirts" });

    const res = await admin
      .put(`/api/admin/categories/${created.id}`)
      .send({ name: "Tops", isActive: false })
      .expect(200);

    expect(res.body.data.category).toMatchObject({ name: "Tops", slug: "shirts", isActive: false });
    await admin.put(`/api/admin/categories/${created.id}`).send({}).expect(400);
  });

  it("only accepts images uploaded through the marketplace", async () => {
    const admin = await createAdminAgent();

    await admin
      .post("/api/admin/categories")
      .send({ name: "Bad URL", image: { url: "https://evil.example/x.jpg", publicId: "marketplace/catalog/x" } })
      .expect(400);

    await admin
      .post("/api/admin/categories")
      .send({ name: "Wrong Folder", image: fakeStorage.ref("marketplace/products/someone", "x") })
      .expect(400);

    await admin.post("/api/admin/categories").send({ name: "Good", image: catalogImage }).expect(201);
  });

  it("cleans up the old image when it is replaced or removed", async () => {
    const admin = await createAdminAgent();
    const first = fakeStorage.ref("marketplace/catalog", "first");
    const second = fakeStorage.ref("marketplace/catalog", "second");
    const created = await createCategory(admin, { name: "Bags", image: first });

    await admin.put(`/api/admin/categories/${created.id}`).send({ image: second }).expect(200);
    expect(fakeStorage.deleted).toContain(first.publicId);

    await admin.put(`/api/admin/categories/${created.id}`).send({ image: null }).expect(200);
    expect(fakeStorage.deleted).toContain(second.publicId);
  });

  it("blocks deleting a category that has subcategories", async () => {
    const admin = await createAdminAgent();
    const men = await createCategory(admin, { name: "Men" });
    const shoes = await createCategory(admin, { name: "Shoes", parent: men.id });

    await admin.delete(`/api/admin/categories/${men.id}`).expect(409);
    await admin.delete(`/api/admin/categories/${shoes.id}`).expect(200);
    await admin.delete(`/api/admin/categories/${men.id}`).expect(200);
    expect(await Category.countDocuments()).toBe(0);
  });

  it("deletes the image from storage when the category is deleted", async () => {
    const admin = await createAdminAgent();
    const created = await createCategory(admin, { name: "Hats", image: catalogImage });

    await admin.delete(`/api/admin/categories/${created.id}`).expect(200);
    expect(fakeStorage.deleted).toContain(catalogImage.publicId);
  });
});