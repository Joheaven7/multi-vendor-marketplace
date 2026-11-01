import { Types } from "mongoose";
import { Product, type ProductStatus } from "../models/Product";
import { Seller } from "../models/Seller";
import type { AdminProductListQuery } from "../validators/product.validator";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, escapeRegex, getSkip } from "../utils/pagination";
import { buildProductDTOs, type ProductDTO, type ProductDocument } from "./product.dto";
import { changeProductStatus } from "./product.service";

type SellerSummary = { id: string; storeName: string; slug: string; status: string };

async function loadSellers(sellerIds: string[]): Promise<Map<string, SellerSummary>> {
  const sellers = await Seller.find({ _id: { $in: [...new Set(sellerIds)] } }).select(
    "storeName slug status",
  );
  return new Map(
    sellers.map((s) => [s.id, { id: s.id, storeName: s.storeName, slug: s.slug, status: s.status }]),
  );
}

async function findOrThrow(productId: string): Promise<ProductDocument> {
  const product = await Product.findOne({ _id: productId, deletedAt: null });
  if (!product) throw AppError.notFound("Product not found");
  return product;
}

export async function listProducts(query: AdminProductListQuery) {
  const { page, limit, status, search, sellerId } = query;

  const filter: Record<string, unknown> = { deletedAt: null };
  if (status) filter.status = status;
  if (sellerId) filter.seller = sellerId;
  if (search) filter.name = new RegExp(escapeRegex(search), "i");

  // The review queue shows the longest-waiting product first.
  const sort = status === "PENDING_REVIEW" ? { createdAt: 1 as const } : { createdAt: -1 as const };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(getSkip(page, limit)).limit(limit),
    Product.countDocuments(filter),
  ]);

  const dtos = await buildProductDTOs(products, { withVariants: false });
  const sellers = await loadSellers(dtos.map((d) => d.sellerId));

  return {
    items: dtos.map((dto) => ({ ...dto, seller: sellers.get(dto.sellerId) ?? null })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function getProduct(
  productId: string,
): Promise<ProductDTO & { seller: SellerSummary | null }> {
  const product = await findOrThrow(productId);
  const [dto] = await buildProductDTOs([product], { withVariants: true });
  const sellers = await loadSellers([dto.sellerId]);
  return { ...dto, seller: sellers.get(dto.sellerId) ?? null };
}

type ModerationStep = { from: ProductStatus; to: ProductStatus; reason?: string };

async function moderate(productId: string, adminId: string, { from, to, reason }: ModerationStep) {
  const product = await findOrThrow(productId);

  // Approve and restore both end in PUBLISHED, but each is only valid from its own status.
  if (product.status !== from) {
    throw new AppError(409, "INVALID_TRANSITION", `Cannot change a product from ${product.status} to ${to}`);
  }

  const needsReason = to === "REJECTED" || to === "HIDDEN";

  await changeProductStatus(product, to, {
    set: {
      moderatedBy: new Types.ObjectId(adminId),
      moderatedAt: new Date(),
      ...(needsReason ? { moderationReason: reason } : {}),
    },
    unset: needsReason ? [] : ["moderationReason"],
  });

  return getProduct(productId);
}

export const approveProduct = (productId: string, adminId: string) =>
  moderate(productId, adminId, { from: "PENDING_REVIEW", to: "PUBLISHED" });

export const rejectProduct = (productId: string, adminId: string, reason: string) =>
  moderate(productId, adminId, { from: "PENDING_REVIEW", to: "REJECTED", reason });

export const hideProduct = (productId: string, adminId: string, reason: string) =>
  moderate(productId, adminId, { from: "PUBLISHED", to: "HIDDEN", reason });

export const unhideProduct = (productId: string, adminId: string) =>
  moderate(productId, adminId, { from: "HIDDEN", to: "PUBLISHED" });

/** Soft delete by an admin. */
export async function deleteProduct(productId: string): Promise<void> {
  const product = await findOrThrow(productId);
  product.deletedAt = new Date();
  await product.save();
}