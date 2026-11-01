import type { Types } from "mongoose";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import { Product, type ProductStatus } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { calculateProductStats } from "../utils/pricing";
import { slugify } from "../utils/slug";
import { variantKey } from "../utils/variants";

export async function makeCategory(
  name: string,
  options: { parent?: Types.ObjectId | string | null; isActive?: boolean } = {},
) {
  return Category.create({
    name,
    slug: slugify(name),
    parent: options.parent ?? null,
    isActive: options.isActive ?? true,
  });
}

export async function makeBrand(name: string, isActive = true) {
  return Brand.create({ name, slug: slugify(name), isActive });
}

type VariantSpec = {
  price: number;
  stock: number;
  optionValues?: { name: string; value: string }[];
  isActive?: boolean;
};

export type ProductOverrides = {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  discountPercent?: number;
  lowStockThreshold?: number;
  status?: ProductStatus;
  brand?: Types.ObjectId | string;
  rating?: number;
  reviews?: number;
  sold?: number;
  isSellerActive?: boolean;
  deletedAt?: Date | null;
  options?: { name: string; values: string[] }[];
  variants?: VariantSpec[];
};

let sequence = 0;

/** A PUBLISHED, publicly visible product unless the overrides say otherwise. */
export async function addProduct(
  sellerId: Types.ObjectId | string,
  categoryId: Types.ObjectId | string,
  overrides: ProductOverrides = {},
) {
  sequence += 1;
  const name = overrides.name ?? `Test Product ${sequence}`;
  const specs: VariantSpec[] = overrides.variants ?? [
    { price: overrides.price ?? 1000, stock: overrides.stock ?? 10 },
  ];
  const discountPercent = overrides.discountPercent ?? 0;

  const product = await Product.create({
    seller: sellerId,
    name,
    slug: `${slugify(name)}-${sequence}`,
    description: overrides.description ?? "A fine product used for testing purposes.",
    category: categoryId,
    brand: overrides.brand,
    images: [
      { url: `https://test-cdn.example/p${sequence}-1.jpg`, publicId: `marketplace/products/x/p${sequence}-1` },
      { url: `https://test-cdn.example/p${sequence}-2.jpg`, publicId: `marketplace/products/x/p${sequence}-2` },
    ],
    options: overrides.options ?? [],
    discountPercent,
    lowStockThreshold: overrides.lowStockThreshold ?? 5,
    status: overrides.status ?? "PUBLISHED",
    isSellerActive: overrides.isSellerActive ?? true,
    deletedAt: overrides.deletedAt ?? null,
    ratingAverage: overrides.rating ?? 0,
    ratingCount: overrides.reviews ?? 0,
    soldCount: overrides.sold ?? 0,
    ...calculateProductStats(
      specs.filter((s) => s.isActive !== false),
      discountPercent,
    ),
  });

  await ProductVariant.create(
    specs.map((spec, index) => ({
      product: product._id,
      seller: sellerId,
      sku: `SKU-${sequence}-${index}`,
      key: variantKey(spec.optionValues ?? []),
      optionValues: spec.optionValues ?? [],
      price: spec.price,
      stock: spec.stock,
      isActive: spec.isActive ?? true,
    })),
  );

  return product;
}