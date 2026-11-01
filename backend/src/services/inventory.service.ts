import { Types, type PipelineStage } from "mongoose";
import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import type { InventoryQuery } from "../validators/product.validator";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, escapeRegex, getSkip } from "../utils/pagination";
import { runInTransaction } from "../utils/transaction";
import { getStockStatus, type StockStatus } from "../utils/variants";
import { refreshProductStats } from "./product.service";

type InventoryRow = {
  _id: Types.ObjectId;
  sku: string;
  optionValues: { name: string; value: string }[];
  stock: number;
  stockStatus: StockStatus;
  productDoc: {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    status: string;
    lowStockThreshold: number;
    images: { url: string }[];
  };
};

export type InventoryItemDTO = {
  id: string;
  sku: string;
  optionValues: { name: string; value: string }[];
  stock: number;
  stockStatus: StockStatus;
  lowStockThreshold: number;
  product: { id: string; name: string; slug: string; status: string; image?: string };
};

/** One row per active variant of the seller's live products. Lowest stock first. */
export async function listInventory(sellerId: string, query: InventoryQuery) {
  const { page, limit, stockStatus, search } = query;

  const pipeline: PipelineStage[] = [
    { $match: { seller: new Types.ObjectId(sellerId), isActive: true } },
    { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "productDoc" } },
    { $unwind: "$productDoc" },
    { $match: { "productDoc.deletedAt": null } },
    {
      $addFields: {
        stockStatus: {
          $switch: {
            branches: [
              { case: { $lte: ["$stock", 0] }, then: "OUT_OF_STOCK" },
              { case: { $lte: ["$stock", "$productDoc.lowStockThreshold"] }, then: "LOW_STOCK" },
            ],
            default: "IN_STOCK",
          },
        },
      },
    },
  ];

  const filters: Record<string, unknown> = {};
  if (stockStatus) filters.stockStatus = stockStatus;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filters.$or = [{ sku: pattern }, { "productDoc.name": pattern }];
  }
  if (Object.keys(filters).length > 0) pipeline.push({ $match: filters });

  pipeline.push(
    { $sort: { stock: 1, "productDoc.name": 1, sku: 1 } },
    {
      $facet: {
        items: [{ $skip: getSkip(page, limit) }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  );

  const [result] = await ProductVariant.aggregate<{
    items: InventoryRow[];
    total: { count: number }[];
  }>(pipeline);

  const items: InventoryItemDTO[] = (result?.items ?? []).map((row) => ({
    id: row._id.toString(),
    sku: row.sku,
    optionValues: row.optionValues.map((o) => ({ name: o.name, value: o.value })),
    stock: row.stock,
    stockStatus: row.stockStatus,
    lowStockThreshold: row.productDoc.lowStockThreshold,
    product: {
      id: row.productDoc._id.toString(),
      name: row.productDoc.name,
      slug: row.productDoc.slug,
      status: row.productDoc.status,
      image: row.productDoc.images[0]?.url,
    },
  }));

  const total = result?.total[0]?.count ?? 0;
  return { items, pagination: buildPaginationMeta(page, limit, total) };
}

/** Sets the stock of one of the seller's own variants. */
export async function setStock(sellerId: string, variantId: string, stock: number) {
  return runInTransaction(async (session) => {
    // Scoped to the seller: another seller's variant is simply "not found".
    const variant = await ProductVariant.findOneAndUpdate(
      { _id: variantId, seller: sellerId, isActive: true },
      { $set: { stock } },
      { returnDocument: "after", session },
    );
    if (!variant) throw AppError.notFound("Variant not found");

    const product = await Product.findOne({ _id: variant.product, deletedAt: null })
      .select("lowStockThreshold")
      .session(session);
    if (!product) throw AppError.notFound("Variant not found");

    await refreshProductStats(variant.product, session);

    return {
      id: variant.id,
      sku: variant.sku,
      stock: variant.stock,
      stockStatus: getStockStatus(variant.stock, product.lowStockThreshold),
      lowStockThreshold: product.lowStockThreshold,
    };
  });
}