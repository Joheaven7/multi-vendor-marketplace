import request from "supertest";
import { describe, expect, it } from "vitest";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { productImageFolder } from "../services/storage";
import { fakeStorage } from "./fake-storage";
import { app, createAdminAgent, createUser, loginAs } from "./helpers";
import {
  colorOptions,
  colorVariants,
  createCatalog,
  createProduct,
  productPayload,
  setupSeller,
  type Payload,
} from "./product-fixtures";

describe("seller area access", () => {
  it("rejects anonymous callers, customers, pending and suspended sellers", async () => {
    await request(app).get("/api/seller/products").expect(401);

    const customer = await createUser();
    await (await loginAs(customer.email)).get("/api/seller/products").expect(403);

    const pending = await setupSeller("PENDING");
    await pending.agent.get("/api/seller/products").expect(403);

    const suspended = await setupSeller("SUSPENDED");
    const res = await suspended.agent.get("/api/seller/products").expect(403);
    expect(res.body.error.code).toBe("SELLER_NOT_ACTIVE");
  });
});

describe("creating products", () => {
  it("creates a draft with a default variant and calculated prices", async () => {
    const { category, brand } = await createCatalog();
    const { seller, agent } = await setupSeller();

    const res = await agent
      .post("/api/seller/products")
      .send(productPayload(seller.id, category.id, { brand: brand.id }))
      .expect(201);

    const product = res.body.data.product;
    expect(product).toMatchObject({
      status: "DRAFT",
      sellerId: seller.id,
      minPrice: 2000,
      maxPrice: 2000,
      minFinalPrice: 1800,
      totalStock: 10,
      categoryName: "Shoes",
      brandName: "Nike",
      isSellerActive: true,
    });
    expect(product.slug).toMatch(/^leather-sneakers-[a-f0-9]{6}$/);
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]).toMatchObject({ sku: "SNK-001", price: 2000, finalPrice: 1800, stock: 10 });
  });

  it("creates a product with option variants", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();

    const product = await createProduct(ctx, category.id, {
      options: colorOptions,
      variants: colorVariants(),
    });

    expect(product).toMatchObject({ minFinalPrice: 1800, totalStock: 8 });
    expect(product.variants.map((v) => v.sku)).toEqual(["SNK-BLK", "SNK-BLU"]);
  });

  it("matches option values without caring about letter case", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();

    const product = await createProduct(ctx, category.id, {
      options: colorOptions,
      variants: [{ sku: "SNK-BLK", price: 2000, stock: 1, optionValues: { color: "black" } }],
    });
    const variant = await ProductVariant.findById(product.variants[0].id);
    expect(variant?.optionValues[0]).toMatchObject({ name: "Color", value: "Black" });
  });

  it("ignores seller, status and totals sent by the client", async () => {
    const { category } = await createCatalog();
    const mine = await setupSeller();
    const other = await setupSeller();

    const res = await mine.agent
      .post("/api/seller/products")
      .send({
        ...productPayload(mine.seller.id, category.id),
        seller: other.seller.id,
        status: "PUBLISHED",
        isSellerActive: false,
        totalStock: 99999,
      })
      .expect(201);

    const saved = await Product.findById(res.body.data.product.id);
    expect(saved?.seller.toString()).toBe(mine.seller.id);
    expect(saved).toMatchObject({ status: "DRAFT", isSellerActive: true, totalStock: 10 });
  });

  const invalidCases: [string, (p: Payload) => Record<string, unknown>][] = [
    ["no images", (p) => ({ ...p, images: [] })],
    ["too many images", (p) => ({ ...p, images: Array.from({ length: 9 }, (_, i) => ({ ...p.images[0], publicId: `${p.images[0].publicId}${i}` })) })],
    ["a discount over 90%", (p) => ({ ...p, discountPercent: 95 })],
    ["a fractional price", (p) => ({ ...p, variants: [{ ...p.variants[0], price: 99.5 }] })],
    ["a zero price", (p) => ({ ...p, variants: [{ ...p.variants[0], price: 0 }] })],
    ["a malformed SKU", (p) => ({ ...p, variants: [{ ...p.variants[0], sku: "a b" }] })],
    ["a short name", (p) => ({ ...p, name: "ab" })],
    ["no variants", (p) => ({ ...p, variants: [] })],
    ["two variants without options", (p) => ({ ...p, variants: [p.variants[0], { ...p.variants[0], sku: "SNK-002" }] })],
    ["a new variant without stock", (p) => ({ ...p, variants: [{ sku: "SNK-001", price: 2000, optionValues: {} }] })],
    ["negative stock", (p) => ({ ...p, variants: [{ ...p.variants[0], stock: -1 }] })],
  ];

  it.each(invalidCases)("rejects %s", async (_label, mutate) => {
    const { category } = await createCatalog();
    const { seller, agent } = await setupSeller();

    const res = await agent
      .post("/api/seller/products")
      .send(mutate(productPayload(seller.id, category.id)))
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("validates option and variant combinations", async () => {
    const { category } = await createCatalog();
    const { seller, agent } = await setupSeller();
    const [black, blue] = colorVariants();
    const post = (overrides: Record<string, unknown>) =>
      agent.post("/api/seller/products").send(productPayload(seller.id, category.id, overrides));

    // Same combination twice.
    await post({ options: colorOptions, variants: [black, { ...black, sku: "SNK-DUP" }] }).expect(400);
    // Value that the option does not define.
    await post({ options: colorOptions, variants: [black, { ...blue, optionValues: { Color: "Green" } }] }).expect(400);
    // Missing a value for an option.
    await post({ options: colorOptions, variants: [black, { ...blue, optionValues: {} }] }).expect(400);
    // Same SKU twice.
    await post({ options: colorOptions, variants: [black, { ...blue, sku: black.sku }] }).expect(400);
    // Variants with option values but no options defined.
    await post({ options: [], variants: [black] }).expect(400);
    // Duplicate option values.
    await post({ options: [{ name: "Color", values: ["Black", "black"] }], variants: [black] }).expect(400);
  });

  it("requires an existing, active category and brand", async () => {
    const { category, brand } = await createCatalog();
    const { seller, agent } = await setupSeller();
    const post = (overrides: Record<string, unknown>) =>
      agent.post("/api/seller/products").send(productPayload(seller.id, category.id, overrides));

    await post({ category: "507f1f77bcf86cd799439011" }).expect(400);
    await post({ brand: "507f1f77bcf86cd799439011" }).expect(400);

    await Category.updateOne({ _id: category.id }, { isActive: false });
    await post({}).expect(400);

    await Category.updateOne({ _id: category.id }, { isActive: true });
    await post({ brand: brand.id }).expect(201);
  });

  it("rejects SKUs already used by the same seller, but not by other sellers", async () => {
    const { category } = await createCatalog();
    const first = await setupSeller();
    const second = await setupSeller();

    await createProduct(first, category.id);
    const res = await first.agent
      .post("/api/seller/products")
      .send(productPayload(first.seller.id, category.id, { name: "Another Shoe" }))
      .expect(409);
    expect(res.body.error.message).toContain("SNK-001");

    await createProduct(second, category.id);
  });

  it("only accepts images uploaded by this seller through the marketplace", async () => {
    const { category } = await createCatalog();
    const { seller, agent } = await setupSeller();
    const post = (images: unknown) =>
      agent.post("/api/seller/products").send(productPayload(seller.id, category.id, { images }));

    await post([fakeStorage.ref(productImageFolder("another-seller"), "x")]).expect(400);
    await post([
      { url: "https://evil.example/a.jpg", publicId: `${productImageFolder(seller.id)}/a` },
    ]).expect(400);
    await post([fakeStorage.ref("marketplace/catalog", "x")]).expect(400);
    await post([fakeStorage.ref(productImageFolder(seller.id), "ok")]).expect(201);
  });
});

describe("updating products", () => {
  it("updates details, keeps the slug and recalculates prices, but never changes existing stock", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const product = await createProduct(ctx, category.id);

    const res = await ctx.agent
      .put(`/api/seller/products/${product.id}`)
      .send(
        productPayload(ctx.seller.id, category.id, {
          name: "Renamed Sneakers",
          discountPercent: 25,
          variants: [{ id: product.variants[0].id, sku: "SNK-001", price: 3000, stock: 999, optionValues: {} }],
        }),
      )
      .expect(200);

    expect(res.body.data.product).toMatchObject({
      name: "Renamed Sneakers",
      slug: product.slug,
      status: "DRAFT",
      minFinalPrice: 2250,
      totalStock: 10,
    });
    expect(res.body.data.product.variants[0].stock).toBe(10);
  });

  it("deactivates removed variants and reactivates the same record when added back", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const product = await createProduct(ctx, category.id, {
      options: colorOptions,
      variants: colorVariants(),
    });
    const [black, blue] = product.variants;
    const put = (overrides: Record<string, unknown>) =>
      ctx.agent
        .put(`/api/seller/products/${product.id}`)
        .send(productPayload(ctx.seller.id, category.id, { options: colorOptions, ...overrides }));

    const blackOnly = { id: black.id, sku: black.sku, price: 2000, optionValues: { Color: "Black" } };

    const removed = await put({ variants: [blackOnly] }).expect(200);
    expect(removed.body.data.product.variants).toHaveLength(1);
    expect(removed.body.data.product.totalStock).toBe(5);
    expect((await ProductVariant.findById(blue.id))?.isActive).toBe(false);

    const restored = await put({
      variants: [blackOnly, { sku: "SNK-BLU", price: 2600, stock: 7, optionValues: { Color: "Blue" } }],
    }).expect(200);

    const back = restored.body.data.product.variants.find((v: { sku: string }) => v.sku === "SNK-BLU");
    expect(back).toMatchObject({ id: blue.id, price: 2600, stock: 7 });
  });

  it("rejects a variant id that belongs to another product", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const first = await createProduct(ctx, category.id);
    const second = await createProduct(ctx, category.id, {
      name: "Second Shoe",
      variants: [{ sku: "SNK-002", price: 1000, stock: 1, optionValues: {} }],
    });

    await ctx.agent
      .put(`/api/seller/products/${second.id}`)
      .send(
        productPayload(ctx.seller.id, category.id, {
          variants: [{ id: first.variants[0].id, sku: "SNK-002", price: 1000, optionValues: {} }],
        }),
      )
      .expect(400);
  });

  it("deletes removed images from storage and never lets a client swap an existing image URL", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const folder = productImageFolder(ctx.seller.id);
    const a = fakeStorage.ref(folder, "a");
    const b = fakeStorage.ref(folder, "b");
    const product = await createProduct(ctx, category.id, { images: [a, b] });

    const res = await ctx.agent
      .put(`/api/seller/products/${product.id}`)
      .send(
        productPayload(ctx.seller.id, category.id, {
          images: [{ url: "https://evil.example/a.jpg", publicId: a.publicId }],
          variants: [{ id: product.variants[0].id, sku: "SNK-001", price: 2000, optionValues: {} }],
        }),
      )
      .expect(200);

    expect(res.body.data.product.images).toEqual([a]);
    expect(fakeStorage.deleted).toContain(b.publicId);
  });

  it("cannot be edited while under review", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const product = await createProduct(ctx, category.id);
    await ctx.agent.post(`/api/seller/products/${product.id}/submit`).expect(200);

    const res = await ctx.agent
      .put(`/api/seller/products/${product.id}`)
      .send(
        productPayload(ctx.seller.id, category.id, {
          variants: [{ id: product.variants[0].id, sku: "SNK-001", price: 2000, optionValues: {} }],
        }),
      )
      .expect(409);
    expect(res.body.error.message).toMatch(/withdraw/i);
  });
});

describe("deleting products", () => {
  it("soft-deletes: gone from the seller's view, kept in the database", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const product = await createProduct(ctx, category.id);

    await ctx.agent.delete(`/api/seller/products/${product.id}`).expect(200);

    await ctx.agent.get(`/api/seller/products/${product.id}`).expect(404);
    const list = await ctx.agent.get("/api/seller/products").expect(200);
    expect(list.body.data.items).toHaveLength(0);
    expect((await Product.findById(product.id))?.deletedAt).toBeInstanceOf(Date);
  });
});

describe("seller isolation", () => {
  it("hides one seller's products and variants from another", async () => {
    const { category } = await createCatalog();
    const alice = await setupSeller();
    const bob = await setupSeller();
    const product = await createProduct(alice, category.id);
    const variantId = product.variants[0].id;
    const base = `/api/seller/products/${product.id}`;

    await bob.agent.get(base).expect(404);
    await bob.agent
      .put(base)
      .send(productPayload(bob.seller.id, category.id, { name: "Hijacked" }))
      .expect(404);
    await bob.agent.delete(base).expect(404);
    await bob.agent.post(`${base}/submit`).expect(404);
    await bob.agent.post(`${base}/withdraw`).expect(404);
    await bob.agent.patch(`/api/seller/inventory/${variantId}`).send({ stock: 0 }).expect(404);

    const bobList = await bob.agent.get("/api/seller/products").expect(200);
    expect(bobList.body.data.items).toHaveLength(0);
    const bobInventory = await bob.agent.get("/api/seller/inventory").expect(200);
    expect(bobInventory.body.data.items).toHaveLength(0);

    const untouched = await Product.findById(product.id);
    expect(untouched).toMatchObject({ name: "Leather Sneakers", totalStock: 10 });
    expect(untouched?.deletedAt).toBeNull();
    expect((await ProductVariant.findById(variantId))?.stock).toBe(10);
  });

  it("only lists the caller's own products", async () => {
    const { category } = await createCatalog();
    const alice = await setupSeller();
    const bob = await setupSeller();
    await createProduct(alice, category.id);
    await createProduct(bob, category.id);

    const res = await alice.agent.get("/api/seller/products").expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].sellerId).toBe(alice.seller.id);
  });
});

describe("submitting for review", () => {
  it("moves DRAFT to PENDING_REVIEW, and back with withdraw", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const product = await createProduct(ctx, category.id);
    const base = `/api/seller/products/${product.id}`;

    await ctx.agent.post(`${base}/withdraw`).expect(409);

    const submitted = await ctx.agent.post(`${base}/submit`).expect(200);
    expect(submitted.body.data.product.status).toBe("PENDING_REVIEW");
    await ctx.agent.post(`${base}/submit`).expect(409);

    const withdrawn = await ctx.agent.post(`${base}/withdraw`).expect(200);
    expect(withdrawn.body.data.product.status).toBe("DRAFT");
  });

  it("refuses when the category is no longer available", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const product = await createProduct(ctx, category.id);
    await Category.updateOne({ _id: category.id }, { isActive: false });

    await ctx.agent.post(`/api/seller/products/${product.id}/submit`).expect(409);
  });

  it("filters the seller's list by status and name", async () => {
    const { category } = await createCatalog();
    const ctx = await setupSeller();
    const first = await createProduct(ctx, category.id);
    await createProduct(ctx, category.id, {
      name: "Canvas Bag",
      variants: [{ sku: "BAG-001", price: 500, stock: 4, optionValues: {} }],
    });
    await ctx.agent.post(`/api/seller/products/${first.id}/submit`).expect(200);

    const pending = await ctx.agent.get("/api/seller/products?status=PENDING_REVIEW").expect(200);
    expect(pending.body.data.items).toHaveLength(1);

    const search = await ctx.agent.get("/api/seller/products?search=canvas").expect(200);
    expect(search.body.data.items.map((p: { name: string }) => p.name)).toEqual(["Canvas Bag"]);

    await ctx.agent.get("/api/seller/products?status=NOPE").expect(400);
  });
});

describe("categories and brands in use", () => {
  it("cannot be deleted while products use them", async () => {
    const { category, brand } = await createCatalog();
    const ctx = await setupSeller();
    const admin = await createAdminAgent();
    const product = await createProduct(ctx, category.id, { brand: brand.id });

    await admin.delete(`/api/admin/categories/${category.id}`).expect(409);
    await admin.delete(`/api/admin/brands/${brand.id}`).expect(409);

    await ctx.agent.delete(`/api/seller/products/${product.id}`).expect(200);

    await admin.delete(`/api/admin/categories/${category.id}`).expect(200);
    await admin.delete(`/api/admin/brands/${brand.id}`).expect(200);
  });
});