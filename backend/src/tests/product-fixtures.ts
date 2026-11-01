import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import type { SellerStatus } from "../models/Seller";
import { productImageFolder } from "../services/storage";
import { fakeStorage } from "./fake-storage";
import { createSellerUser, loginAs } from "./helpers";

export async function createCatalog() {
  const category = await Category.create({ name: "Shoes", slug: "shoes" });
  const brand = await Brand.create({ name: "Nike", slug: "nike" });
  return { category, brand };
}

/** A seller (created directly in the database) and a signed-in client for them. */
export async function setupSeller(status: SellerStatus = "ACTIVE") {
  const { user, seller } = await createSellerUser(status);
  const agent = await loginAs(user.email);
  return { user, seller, agent };
}

export type SellerContext = Awaited<ReturnType<typeof setupSeller>>;

export type Payload = {
  name: string;
  description: string;
  category: string;
  images: { url: string; publicId: string }[];
  specifications: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  discountPercent: number;
  lowStockThreshold: number;
  variants: {
    id?: string;
    sku: string;
    price: number;
    stock?: number;
    optionValues: Record<string, string>;
  }[];
  [key: string]: unknown;
};

/** A valid simple product (one default variant, 10% discount). */
export function productPayload(
  sellerId: string,
  categoryId: string,
  overrides: Record<string, unknown> = {},
): Payload {
  return {
    name: "Leather Sneakers",
    description: "Comfortable handmade leather sneakers.",
    category: categoryId,
    images: [fakeStorage.ref(productImageFolder(sellerId), "front")],
    specifications: [{ label: "Material", value: "Leather" }],
    options: [],
    discountPercent: 10,
    lowStockThreshold: 5,
    variants: [{ sku: "SNK-001", price: 2000, stock: 10, optionValues: {} }],
    ...overrides,
  } as Payload;
}

export const colorOptions = [{ name: "Color", values: ["Black", "Blue"] }];

export function colorVariants() {
  return [
    { sku: "SNK-BLK", price: 2000, stock: 5, optionValues: { Color: "Black" } },
    { sku: "SNK-BLU", price: 2500, stock: 3, optionValues: { Color: "Blue" } },
  ];
}

export type ProductBody = {
  id: string;
  slug: string;
  status: string;
  totalStock: number;
  minFinalPrice: number;
  moderationReason?: string;
  images: { url: string; publicId: string }[];
  variants: { id: string; sku: string; stock: number; price: number }[];
};

export async function createProduct(
  ctx: SellerContext,
  categoryId: string,
  overrides: Record<string, unknown> = {},
): Promise<ProductBody> {
  const res = await ctx.agent
    .post("/api/seller/products")
    .send(productPayload(ctx.seller.id, categoryId, overrides))
    .expect(201);
  return res.body.data.product as ProductBody;
}