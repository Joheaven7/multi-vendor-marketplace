export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

/**
 * The marketplace never talks to Cloudinary directly. Anything that can store images
 * (Cloudinary, S3, local disk, a test fake) just implements this interface.
 */
export interface ImageStorage {
  upload(buffer: Buffer, options: { folder: string }): Promise<UploadedImage>;
  delete(publicId: string): Promise<void>;
  /** True if the URL points at this storage. Used to reject images from anywhere else. */
  ownsUrl(url: string): boolean;
}