import request from "supertest";
import { describe, expect, it } from "vitest";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { Seller } from "../models/Seller";
import { User } from "../models/User";
import { DEMO_CUSTOMER, DEMO_PASSWORD, DEMO_PRODUCTS, DEMO_SELLERS, demoImages } from "../scripts/demo-data";
import { resetDemoData, seedDemoData } from "../scripts/demo-seed";
import { calculateProductStats } from "../utils/pricing";
import { productSchema } from "../validators/product.validator";
import { app, createUser } from "./helpers";

describe("demo seed", () => {
  it("creates a consistent marketplace", async () => {
    const counts = await seedDemoData();

    expect(counts.products).toBe(DEMO_PRODUCTS.length);
    expect(await Product.countDocuments()).toBe(DEMO_PRODUCTS.length);

    // Every product's denormalized numbers match its variants.
    for (const product of await Product.find()) {
      const variants = await ProductVariant.find({ product: product._id });
      expect(variants.length).toBeGreaterThan(0);
      expect(product).toMatchObject(calculateProductStats(variants, product.discountPercent));
    }

    // Approved sellers have the SELLER role, the pending applicant does not.
    for (const def of DEMO_SELLERS) {
      const user = await User.findOne({ email: def.owner.email });
      const seller = await Seller.findOne({ user: user?._id });
      expect(seller?.status).toBe(def.status);
      expect(user?.role).toBe(def.status === "ACTIVE" ? "SELLER" : "CUSTOMER");
    }

    // The data covers every moderation state and both stock warnings.
    const statuses = new Set((await Product.find()).map((p) => p.status));
    expect(statuses).toEqual(new Set(["PUBLISHED", "PENDING_REVIEW", "DRAFT", "REJECTED"]));
    expect(await ProductVariant.countDocuments({ stock: 0 })).toBeGreaterThan(0);
    expect(await Product.countDocuments({ status: "PUBLISHED", isSellerActive: true })).toBeGreaterThan(0);
  });

  it("can be run repeatedly without duplicating anything", async () => {
    await seedDemoData();
    const before = {
      categories: await Category.countDocuments(),
      brands: await Brand.countDocuments(),
      users: await User.countDocuments(),
      sellers: await Seller.countDocuments(),
      products: await Product.countDocuments(),
      variants: await ProductVariant.countDocuments(),
    };

    const second = await seedDemoData();

    expect(second).toEqual({ categories: 0, brands: 0, users: 0, sellers: 0, products: 0 });
    expect(await Product.countDocuments()).toBe(before.products);
    expect(await ProductVariant.countDocuments()).toBe(before.variants);
    expect(await User.countDocuments()).toBe(before.users);
    expect(await Category.countDocuments()).toBe(before.categories);
  });

  it("uses data that passes the real product validation rules", async () => {
    for (const def of DEMO_PRODUCTS) {
      const result = productSchema.safeParse({
        name: def.name,
        description: def.description,
        category: "507f1f77bcf86cd799439011",
        images: demoImages(def.name),
        specifications: def.specifications,
        options: def.options,
        discountPercent: def.discountPercent,
        lowStockThreshold: def.lowStockThreshold,
        variants: def.variants,
      });

      expect(result.success, `${def.name}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it("lets the demo accounts sign in", async () => {
    await seedDemoData();

    for (const email of [DEMO_CUSTOMER.email, DEMO_SELLERS[0].owner.email]) {
      await request(app).post("/api/auth/login").send({ email, password: DEMO_PASSWORD }).expect(200);
    }
  });

  it("shows seeded sellers only their own products", async () => {
    await seedDemoData();
    const login = await request.agent(app);
    await login
      .post("/api/auth/login")
      .send({ email: DEMO_SELLERS[1].owner.email, password: DEMO_PASSWORD })
      .expect(200);

    const res = await login.get("/api/seller/products?limit=50").expect(200);
    const expected = DEMO_PRODUCTS.filter((p) => p.seller === "addis").length;

    expect(res.body.data.items).toHaveLength(expected);
    expect(res.body.data.items.every((p: { sellerId: string }) => p.sellerId === res.body.data.items[0].sellerId)).toBe(true);
  });

  it("reset removes the demo accounts and products but not other data", async () => {
    const stranger = await createUser({ name: "Not Demo" });
    await seedDemoData();

    const removed = await resetDemoData();

    expect(removed.products).toBe(DEMO_PRODUCTS.length);
    expect(await Product.countDocuments()).toBe(0);
    expect(await ProductVariant.countDocuments()).toBe(0);
    expect(await Seller.countDocuments()).toBe(0);
    expect(await User.findOne({ email: DEMO_CUSTOMER.email })).toBeNull();
    expect(await User.findById(stranger.id)).not.toBeNull();
    expect(await Category.countDocuments()).toBeGreaterThan(0);

    // And seeding again afterwards works.
    expect((await seedDemoData()).products).toBe(DEMO_PRODUCTS.length);
  });
});