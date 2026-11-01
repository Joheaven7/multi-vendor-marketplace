import { Schema } from "mongoose";

export interface IManagedImage {
  url: string;
  publicId: string;
}

/** Embedded sub-document used wherever a record has an image. */
export const imageSchema = new Schema<IManagedImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);