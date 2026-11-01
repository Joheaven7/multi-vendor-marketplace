import { Schema, model, type Types } from "mongoose";

export interface IVariantOptionValue {
  name: string;
  value: string;
}

export interface IProductVariant {
  product: Types.ObjectId;
  /** Copied from the product so inventory queries are ownership-checked directly. */
  seller: Types.ObjectId;
  sku: string;
  /** Canonical form of optionValues (see utils/variants.ts). "default" for simple products. */
  key: string;
  optionValues: IVariantOptionValue[];
  /** Whole ETB, before the product's discount. */
  price: number;
  stock: number;
  /** Removed variants are deactivated, not deleted, so past orders keep a real record. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const optionValueSchema = new Schema<IVariantOptionValue>(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const variantSchema = new Schema<IProductVariant>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    key: { type: String, required: true },
    optionValues: { type: [optionValueSchema], default: [] },
    price: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: "Price must be a whole number of ETB" },
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: "Stock must be a whole number" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

variantSchema.index({ seller: 1, sku: 1 }, { unique: true });
variantSchema.index({ product: 1, key: 1 }, { unique: true });
variantSchema.index({ product: 1, isActive: 1 });
variantSchema.index({ seller: 1, isActive: 1, stock: 1 });

export const ProductVariant = model<IProductVariant>("ProductVariant", variantSchema);