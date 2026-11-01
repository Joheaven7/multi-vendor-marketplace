import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { CloudinaryImageStorage } from "./cloudinary.storage";
import type { ImageStorage } from "./image-storage";

export type { ImageStorage, UploadedImage } from "./image-storage";

export const CATALOG_FOLDER = "marketplace/catalog";
export const productImageFolder = (sellerId: string) => `marketplace/products/${sellerId}`;

export type ImageRef = { url: string; publicId: string };

/** Used when Cloudinary keys are missing: the app runs, only uploads are unavailable. */
class UnconfiguredImageStorage implements ImageStorage {
  async upload(): Promise<never> {
    throw new AppError(503, "UPLOADS_NOT_CONFIGURED", "Image uploads are not configured on this server");
  }
  async delete(): Promise<void> {}
  ownsUrl(): boolean {
    return false;
  }
}

function createDefaultStorage(): ImageStorage {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    return new CloudinaryImageStorage({ cloudName, apiKey, apiSecret });
  }
  logger.warn("Cloudinary is not configured. Image uploads are disabled.");
  return new UnconfiguredImageStorage();
}

let current: ImageStorage | undefined;

export function getImageStorage(): ImageStorage {
  current ??= createDefaultStorage();
  return current;
}

/** Replaces the storage (used by tests). Pass undefined to go back to the default. */
export function setImageStorage(storage: ImageStorage | undefined): void {
  current = storage;
}

/**
 * Accepts only images that were uploaded through this marketplace, into the expected folder.
 * Without this, a client could attach any URL (or another seller's image) to a record.
 */
export function assertManagedImage(image: ImageRef, folder: string): void {
  if (!image.publicId.startsWith(`${folder}/`) || !getImageStorage().ownsUrl(image.url)) {
    throw AppError.badRequest("Image was not uploaded through the marketplace upload endpoint");
  }
}

/** Best-effort cleanup. A failure here must never fail the request. */
export async function deleteImageQuietly(publicId: string | undefined): Promise<void> {
  if (!publicId) return;
  try {
    await getImageStorage().delete(publicId);
  } catch (error) {
    logger.warn({ error, publicId }, "Could not delete image from storage");
  }
}