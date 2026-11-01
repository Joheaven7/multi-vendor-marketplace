import { Schema, model, type Types } from "mongoose";
import { imageSchema, type IManagedImage } from "./image.schema";

export interface ICategory {
  name: string;
  slug: string;
  /** null for top-level categories. A parent must itself be top-level (two levels maximum). */
  parent: Types.ObjectId | null;
  image?: IManagedImage;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    image: { type: imageSchema },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Category = model<ICategory>("Category", categorySchema);