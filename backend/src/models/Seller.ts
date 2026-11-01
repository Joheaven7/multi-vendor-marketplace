import { Schema, model, type Types } from "mongoose";

export const SELLER_STATUSES = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

/**
 * Allowed seller status changes (see docs/02-business-rules.md).
 * REJECTED -> PENDING happens when the seller re-applies.
 */
export const SELLER_TRANSITIONS: Record<SellerStatus, readonly SellerStatus[]> = {
  PENDING: ["ACTIVE", "REJECTED"],
  ACTIVE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  REJECTED: ["PENDING"],
};

export interface ISellerAddress {
  region: string;
  city: string;
  subcity?: string;
  details?: string;
}

export interface ISellerDocument {
  url: string;
  publicId?: string;
  type: string;
}

export interface ISeller {
  user: Types.ObjectId;
  storeName: string;
  slug: string;
  description?: string;
  logo?: { url: string; publicId?: string };
  businessName: string;
  phone: string;
  address: ISellerAddress;
  tinNumber?: string;
  documents: ISellerDocument[];
  status: SellerStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  suspensionReason?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<ISellerAddress>(
  {
    region: { type: String, required: true, trim: true, maxlength: 60 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    subcity: { type: String, trim: true, maxlength: 60 },
    details: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const documentSchema = new Schema<ISellerDocument>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    type: { type: String, required: true },
  },
  { _id: false },
);

const logoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
  },
  { _id: false },
);

const sellerSchema = new Schema<ISeller>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    storeName: { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    logo: { type: logoSchema },
    businessName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    address: { type: addressSchema, required: true },
    tinNumber: { type: String, trim: true },
    documents: { type: [documentSchema], default: [] },
    status: { type: String, enum: SELLER_STATUSES, default: "PENDING" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },
    suspensionReason: { type: String, maxlength: 500 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Admin list: filter by status, newest first.
sellerSchema.index({ status: 1, createdAt: -1 });

export const Seller = model<ISeller>("Seller", sellerSchema);