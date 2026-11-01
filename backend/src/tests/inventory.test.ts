import { describe, expect, it } from "vitest";
import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { createCatalog, createProduct, setupSeller } from "./product-fixtures";

async function sellerWithVariants() {
  const { category } = await createCatalog();
  const ctx = await setupSeller();
  const product = await createProduct(ctx, category.id, {
    lowStockThreshold: 5,
    options: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
    variants: [
      { sku: "TEE-S", price: 500, stock: 0, optionValues: { Size: "S" } },
      { sku: "TEE-M", price: 500, stock: 3, optionValues: { Size: "M" } },
      { sku: "TEE-L", price: 500, stock: 5, optionValues: { Size: "L" } },
      { sku: "TEE-XL", price: 500, stock: 6, optionValues: { Size: "XL" } },
    ],
  });
  return { ctx, product };
}

describe("GET /api/seller/inventory", () => {
  it("lists variants with stock status, lowest stock first", async () => {
    const { ctx } = await sellerWithVariants();

    const res = await ctx.agent.get("/api/seller/inventory").expect(200);
    const rows = res.body.data.items as { sku: string; stockStatus: string }[];

    expect(rows.map((r) => [r.sku, r.stockStatus])).toEqual([
      ["TEE-S", "OUT_OF_STOCK"],
      ["TEE-M", "LOW_STOCK"],
      ["TEE-L", "LOW_STOCK"],
      ["TEE-XL", "IN_STOCK"],
    ]);
    expect(res.body.data.items[0]).toMatchObject({
      lowStockThreshold: 5,
      product: { name: "Leather Sneakers" },
    });
  });

  it("filters by stock status, searches and paginates", async () => {
    const { ctx } = await sellerWithVariants();

    const low = await ctx.agent.get("/api/seller/inventory?stockStatus=LOW_STOCK").expect(200);
    expect(low.body.data.items).toHaveLength(2);

    const search = await ctx.agent.get("/api/seller/inventory?search=tee-xl").expect(200);
    expect(search.body.data.items.map((r: { sku: string }) => r.sku)).toEqual(["TEE-XL"]);

    const page = await ctx.agent.get("/api/seller/inventory?limit=3&page=2").expect(200);
    expect(page.body.data.items).toHaveLength(1);
    expect(page.body.data.pagination).toMatchObject({ total: 4, totalPages: 2 });

    await ctx.agent.get("/api/seller/inventory?stockStatus=NOPE").expect(400);
  });

  it("leaves out deactivated variants and deleted products", async () => {
    const { ctx, product } = await sellerWithVariants();
    await ProductVariant.updateOne({ sku: "TEE-S" }, { isActive: false });

    let res = await ctx.agent.get("/api/seller/inventory").expect(200);
    expect(res.body.data.items).toHaveLength(3);

    await ctx.agent.delete(`/api/seller/products/${product.id}`).expect(200);
    res = await ctx.agent.get("/api/seller/inventory").expect(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});

describe("PATCH /api/seller/inventory/:variantId", () => {
  it("sets the stock and updates the product total", async () => {
    const { ctx, product } = await sellerWithVariants();
    const variant = await ProductVariant.findOne({ sku: "TEE-S" });

    const res = await ctx.agent
      .patch(`/api/seller/inventory/${variant?.id}`)
      .send({ stock: 20 })
      .expect(200);

    expect(res.body.data.item).toMatchObject({ sku: "TEE-S", stock: 20, stockStatus: "IN_STOCK" });
    expect((await Product.findById(product.id))?.totalStock).toBe(20 + 3 + 5 + 6);
  });

  it("can set stock to zero", async () => {
    const { ctx } = await sellerWithVariants();
    const variant = await ProductVariant.findOne({ sku: "TEE-XL" });

    const res = await ctx.agent
      .patch(`/api/seller/inventory/${variant?.id}`)
      .send({ stock: 0 })
      .expect(200);
    expect(res.body.data.item.stockStatus).toBe("OUT_OF_STOCK");
  });

  it("rejects invalid stock and unknown variants", async () => {
    const { ctx } = await sellerWithVariants();
    const variant = await ProductVariant.findOne({ sku: "TEE-S" });
    const url = `/api/seller/inventory/${variant?.id}`;

    await ctx.agent.patch(url).send({ stock: -1 }).expect(400);
    await ctx.agent.patch(url).send({ stock: 2.5 }).expect(400);
    await ctx.agent.patch(url).send({}).expect(400);
    await ctx.agent.patch("/api/seller/inventory/507f1f77bcf86cd799439011").send({ stock: 1 }).expect(404);
    await ctx.agent.patch("/api/seller/inventory/not-an-id").send({ stock: 1 }).expect(400);
  });
});