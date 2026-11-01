import type { HydratedDocument, Types } from "mongoose";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import type { IProduct } from "../models/Product";
import { Seller } from "../models/Seller";

/**
 * THE visibility rule for the storefront. Every public product query starts from this,
 * so a draft, hidden, deleted or suspended-seller product can never appear anywhere.
 * (The category check is added separately, see getActiveCategoryIds.)
 */
export const PUBLIC_BASE_FILTER = {
  status: "PUBLISHED",
  isSellerActive: true,
  deletedAt: null,
} as const;

/** Active categories whose parent (if any) is active too. */
export async function getActiveCategoryIds(): Promise<Types.ObjectId[]> {
  const categories = await Category.find({ isActive: true }).select("parent");
  const activeTopLevel = new Set(categories.filter((c) => !c.parent).map((c) => c.id));

  return categories
    .filter((c) => !c.parent || activeTopLevel.has(c.parent.toString()))
    .map((c) => c._id);
}

export type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  secondaryImage: string | null;
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  discountPercent: number;
  brand: { name: string; slug: string } | null;
  seller: { storeName: string; slug: string } | null;
  ratingAverage: number;
  ratingCount: number;
  inStock: boolean;
  hasOptions: boolean;
  isNew: boolean;
};

const NEW_PRODUCT_DAYS = 14;

/** Public product cards. Contains no SKU, exact stock, moderation or seller-private data. */
export async function buildProductCards(
  products: HydratedDocument<IProduct>[],
): Promise<ProductCardDTO[]> {
  if (products.length === 0) return [];

  const brandIds = [...new Set(products.flatMap((p) => (p.brand ? [p.brand.toString()] : [])))];
  const sellerIds = [...new Set(products.map((p) => p.seller.toString()))];

  const [brands, sellers] = await Promise.all([
    Brand.find({ _id: { $in: brandIds } }).select("name slug"),
    Seller.find({ _id: { $in: sellerIds } }).select("storeName slug"),
  ]);
  const brandById = new Map(brands.map((b) => [b.id, { name: b.name, slug: b.slug }]));
  const sellerById = new Map(sellers.map((s) => [s.id, { storeName: s.storeName, slug: s.slug }]));

  const newSince = Date.now() - NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;

  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0]?.url ?? null,
    secondaryImage: product.images[1]?.url ?? null,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    minFinalPrice: product.minFinalPrice,
    discountPercent: product.discountPercent,
    brand: product.brand ? (brandById.get(product.brand.toString()) ?? null) : null,
    seller: sellerById.get(product.seller.toString()) ?? null,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    inStock: product.totalStock > 0,
    hasOptions: product.options.length > 0,
    isNew: product.createdAt.getTime() >= newSince,
  }));
}