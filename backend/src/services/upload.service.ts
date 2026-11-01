import { Seller } from "../models/Seller";
import type { Role } from "../models/User";
import type { UploadPurpose } from "../validators/catalog.validator";
import { AppError } from "../utils/AppError";
import { detectImageType } from "../utils/image";
import { logger } from "../utils/logger";
import { CATALOG_FOLDER, getImageStorage, productImageFolder, type UploadedImage } from "./storage";

type Uploader = { id: string; role: Role };

/** The folder is decided here, from who is uploading. The client never chooses it. */
async function resolveFolder(user: Uploader, purpose: UploadPurpose): Promise<string> {
  if (purpose === "catalog") {
    if (user.role !== "ADMIN") throw AppError.forbidden("Only admins can upload catalog images");
    return CATALOG_FOLDER;
  }

  if (user.role !== "SELLER") throw AppError.forbidden("Only sellers can upload product images");
  const seller = await Seller.findOne({ user: user.id });
  if (!seller || seller.status !== "ACTIVE") {
    throw new AppError(403, "SELLER_NOT_ACTIVE", "Your seller account is not active");
  }
  return productImageFolder(seller.id);
}

export async function uploadImage(
  user: Uploader,
  purpose: UploadPurpose,
  buffer: Buffer,
): Promise<UploadedImage> {
  if (!detectImageType(buffer)) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "The file is not a valid JPEG, PNG or WebP image");
  }

  const folder = await resolveFolder(user, purpose);

  try {
    return await getImageStorage().upload(buffer, { folder });
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error({ error, folder }, "Image upload failed");
    throw new AppError(502, "UPLOAD_FAILED", "The image could not be uploaded. Please try again.");
  }
}