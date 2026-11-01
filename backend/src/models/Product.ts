import { Schema, model, type Types } from "mongoose";
import { imageSchema, type IManagedImage } from "./image.schema";

export const PRODUCT_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "HIDDEN",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Allowed status changes (see docs/02-business-rules.md). */
export const PRODUCT_TRANSITIONS: Record<ProductStatus, readonly ProductStatus[]> = {
  DRAFT: ["PENDING_REVIEW"],
  PENDING_REVIEW: ["DRAFT", "PUBLISHED", "REJECTED"],
  PUBLISHED: ["HIDDEN"],
  REJECTED: ["PENDING_REVIEW"],
  HIDDEN: ["PUBLISHED"],
};

export interface ISpecification {
  label: string;
  value: string;
}

export interface IProductOption {
  name: string;
  values: string[];
}

export interface IProduct {
  seller: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  brand?: Types.ObjectId;
  images: IManagedImage[];
  specifications: ISpecification[];
  options: IProductOption[];
  discountPercent: number;
  lowStockThreshold: number;
  status: ProductStatus;
  /** Why an admin rejected or hid the product. Shown to the seller. */
  moderationReason?: string;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
  /** Soft delete: order history keeps pointing at real records. */
  deletedAt?: Date | null;
  /** False while the seller is suspended, so public queries need no join. */
  isSellerActive: boolean;
  // Denormalized from the variants (see utils/pricing.ts), for fast sorting and filtering.
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  totalStock: number;
  // Denormalized by later phases: reviews (Phase 9) and orders (Phase 6).
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const specificationSchema = new Schema<ISpecification>(
  {
    label: { type: String, required: true, trim: true, maxlength: 50 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const optionSchema = new Schema<IProductOption>(
  {
    name: { type: String, required: true, trim: true, maxlength: 30 },
    values: { type: [String], required: true },
  },
  { _id: false },
);

const productSchema = new Schema<IProduct>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
    images: { type: [imageSchema], default: [] },
    specifications: { type: [specificationSchema], default: [] },
    options: { type: [optionSchema], default: [] },
    discountPercent: { type: Number, default: 0, min: 0, max: 90 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    status: { type: String, enum: PRODUCT_STATUSES, default: "DRAFT" },
    moderationReason: { type: String, maxlength: 500 },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
    deletedAt: { type: Date, default: null },
    isSellerActive: { type: Boolean, default: true },
    minPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    minFinalPrice: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Seller's own product list.
productSchema.index({ seller: 1, deletedAt: 1, status: 1, createdAt: -1 });

// Storefront: filtering by category and price.
productSchema.index({ status: 1, isSellerActive: 1, deletedAt: 1, category: 1, minFinalPrice: 1 });
// Storefront: the three other sort orders.
productSchema.index({ status: 1, isSellerActive: 1, deletedAt: 1, createdAt: -1 });
productSchema.index({ status: 1, isSellerActive: 1, deletedAt: 1, soldCount: -1 });
productSchema.index({ status: 1, isSellerActive: 1, deletedAt: 1, ratingAverage: -1 });

// Storefront search: matches in the name count ten times more than in the description.
productSchema.index(
  { name: "text", description: "text" },
  { weights: { name: 10, description: 1 }, name: "product_text_search" },
);

export const Product = model<IProduct>("Product", productSchema);