import { describe, expect, it } from "vitest";
import { Product } from "../models/Product";
import { createAdminAgent } from "./helpers";
import {
  createCatalog,
  createProduct,
  productPayload,
  setupSeller,
} from "./product-fixtures";

/** A seller with one product that has been submitted for review, plus an admin. */
async function submittedProduct() {
  const { category } = await createCatalog();
  const ctx = await setupSeller();
  const product = await createProduct(ctx, category.id);
  await ctx.agent.post(`/api/seller/products/${product.id}/submit`).expect(200);
  const admin = await createAdminAgent();
  return { ctx, product, admin, category };
}

describe("approval", () => {
  it("publishes a product that is pending review", async () => {
    const { product, admin } = await submittedProduct();

    const res = await admin.patch(`/api/admin/products/${product.id}/approve`).expect(200);
    expect(res.body.data.product.status).toBe("PUBLISHED");

    const saved = await Product.findById(product.id);
    expect(saved?.moderatedBy).toBeDefined();
    expect(saved?.moderatedAt).toBeInstanceOf(Date);
  });

  it("cannot approve a draft or approve twice", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const draft = await createProduct(ctx, category.id);
    const admin = await createAdminAgent();

    await admin.patch(`/api/admin/products/${draft.id}/approve`).expect(409);

    await ctx.agent.post(`/api/seller/products/${draft.id}/submit`).expect(200);
    await admin.patch(`/api/admin/products/${draft.id}/approve`).expect(200);
    const again = await admin.patch(`/api/admin/products/${draft.id}/approve`).expect(409);
    expect(again.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("returns 404 for an unknown product and 400 for a malformed id", async () => {
    const admin = await createAdminAgent();
    await admin.patch("/api/admin/products/507f1f77bcf86cd799439011/approve").expect(404);
    await admin.patch("/api/admin/products/not-an-id/approve").expect(400);
  });
});

describe("rejection and resubmission", () => {
  it("requires a reason and shows it to the seller", async () => {
    const { ctx, product, admin } = await submittedProduct();

    await admin.patch(`/api/admin/products/${product.id}/reject`).send({}).expect(400);
    await admin
      .patch(`/api/admin/products/${product.id}/reject`)
      .send({ reason: "Photos are too blurry" })
      .expect(200);

    const seen = await ctx.agent.get(`/api/seller/products/${product.id}`).expect(200);
    expect(seen.body.data.product).toMatchObject({
      status: "REJECTED",
      moderationReason: "Photos are too blurry",
    });
  });

  it("lets the seller fix and resubmit a rejected product", async () => {
    const { ctx, product, admin, category } = await submittedProduct();
    await admin
      .patch(`/api/admin/products/${product.id}/reject`)
      .send({ reason: "Description is too short" })
      .expect(200);

    // Editing keeps it REJECTED until it is resubmitted.
    const edited = await ctx.agent
      .put(`/api/seller/products/${product.id}`)
      .send(
        productPayload(ctx.seller.id, category.id, {
          description: "A much longer and more useful description of the sneakers.",
          variants: [{ id: product.variants[0].id, sku: "SNK-001", price: 2000, optionValues: {} }],
        }),
      )
      .expect(200);
    expect(edited.body.data.product.status).toBe("REJECTED");

    const resubmitted = await ctx.agent.post(`/api/seller/products/${product.id}/submit`).expect(200);
    expect(resubmitted.body.data.product.status).toBe("PENDING_REVIEW");
    expect(resubmitted.body.data.product.moderationReason).toBeUndefined();

    await admin.patch(`/api/admin/products/${product.id}/approve`).expect(200);
  });
});

describe("live products", () => {
  it("stay published when the seller edits them", async () => {
    const { ctx, product, admin, category } = await submittedProduct();
    await admin.patch(`/api/admin/products/${product.id}/approve`).expect(200);

    const res = await ctx.agent
      .put(`/api/seller/products/${product.id}`)
      .send(
        productPayload(ctx.seller.id, category.id, {
          name: "Leather Sneakers V2",
          variants: [{ id: product.variants[0].id, sku: "SNK-001", price: 2100, optionValues: {} }],
        }),
      )
      .expect(200);

    expect(res.body.data.product).toMatchObject({ status: "PUBLISHED", name: "Leather Sneakers V2" });
  });

  it("can be hidden with a reason and restored", async () => {
    const { ctx, product, admin } = await submittedProduct();
    await admin.patch(`/api/admin/products/${product.id}/approve`).expect(200);

    await admin.patch(`/api/admin/products/${product.id}/hide`).send({}).expect(400);
    const hidden = await admin
      .patch(`/api/admin/products/${product.id}/hide`)
      .send({ reason: "Counterfeit report under investigation" })
      .expect(200);
    expect(hidden.body.data.product.status).toBe("HIDDEN");

    const seen = await ctx.agent.get(`/api/seller/products/${product.id}`).expect(200);
    expect(seen.body.data.product.moderationReason).toBe("Counterfeit report under investigation");

    const restored = await admin.patch(`/api/admin/products/${product.id}/unhide`).expect(200);
    expect(restored.body.data.product.status).toBe("PUBLISHED");
    expect(restored.body.data.product.moderationReason).toBeUndefined();
  });

  it("cannot be hidden unless published, or unhidden unless hidden", async () => {
    const { product, admin } = await submittedProduct();

    await admin.patch(`/api/admin/products/${product.id}/hide`).send({ reason: "Not live yet" }).expect(409);
    await admin.patch(`/api/admin/products/${product.id}/unhide`).expect(409);
  });

    it("cannot approve a hidden product", async () => {
    const { product, admin } = await submittedProduct();
    await admin.patch(`/api/admin/products/${product.id}/approve`).expect(200);
    await admin.patch(`/api/admin/products/${product.id}/hide`).send({ reason: "Under review" }).expect(200);

    await admin.patch(`/api/admin/products/${product.id}/approve`).expect(409);
  });
});

describe("seller suspension", () => {
  it("hides the seller's products and blocks the seller, and reactivation restores both", async () => {
    const { ctx, product, admin, category } = await submittedProduct();
    await admin.patch(`/api/admin/products/${product.id}/approve`).expect(200);

    await admin
      .patch(`/api/admin/sellers/${ctx.seller.id}/suspend`)
      .send({ reason: "Policy violation" })
      .expect(200);

    expect((await Product.findById(product.id))?.isSellerActive).toBe(false);
    await ctx.agent
      .put(`/api/seller/products/${product.id}`)
      .send(productPayload(ctx.seller.id, category.id))
      .expect(403);
    await ctx.agent.post("/api/seller/products").send(productPayload(ctx.seller.id, category.id)).expect(403);

    await admin.patch(`/api/admin/sellers/${ctx.seller.id}/reactivate`).expect(200);
    expect((await Product.findById(product.id))?.isSellerActive).toBe(true);
    await ctx.agent.get(`/api/seller/products/${product.id}`).expect(200);
  });
});

describe("admin product list", () => {
  it("filters by status, includes seller details and the review queue is oldest first", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const admin = await createAdminAgent();

    const older = await createProduct(ctx, category.id, { name: "Older Shoe" });
    const newer = await createProduct(ctx, category.id, {
      name: "Newer Shoe",
      variants: [{ sku: "SNK-002", price: 1500, stock: 2, optionValues: {} }],
    });
    await createProduct(ctx, category.id, {
      name: "Still Draft",
      variants: [{ sku: "SNK-003", price: 900, stock: 2, optionValues: {} }],
    });
    for (const product of [older, newer]) {
      await ctx.agent.post(`/api/seller/products/${product.id}/submit`).expect(200);
    }

    const queue = await admin.get("/api/admin/products?status=PENDING_REVIEW").expect(200);
    expect(queue.body.data.items.map((p: { name: string }) => p.name)).toEqual([
      "Older Shoe",
      "Newer Shoe",
    ]);
    expect(queue.body.data.items[0].seller).toMatchObject({ id: ctx.seller.id });

    const search = await admin.get("/api/admin/products?search=draft").expect(200);
    expect(search.body.data.items).toHaveLength(1);

    const detail = await admin.get(`/api/admin/products/${older.id}`).expect(200);
    expect(detail.body.data.product.variants).toHaveLength(1);
    expect(detail.body.data.product.seller.storeName).toBe(`Store ${ctx.seller.slug.split("-")[1]}`);

    await admin.get("/api/admin/products?status=NOPE").expect(400);
  });

  it("lets an admin delete a product, which hides it from every list", async () => {
    const { product, admin } = await submittedProduct();

    await admin.delete(`/api/admin/products/${product.id}`).expect(200);
    await admin.get(`/api/admin/products/${product.id}`).expect(404);
    const list = await admin.get("/api/admin/products").expect(200);
    expect(list.body.data.items).toHaveLength(0);
  });
});