import { Schema, model } from "mongoose";
import { imageSchema, type IManagedImage } from "./image.schema";

export interface IBrand {
  name: string;
  slug: string;
  logo?: IManagedImage;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: { type: imageSchema },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Brand = model<IBrand>("Brand", brandSchema);