import { v2 as cloudinary } from "cloudinary";
import type { ImageStorage, UploadedImage } from "./image-storage";

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export class CloudinaryImageStorage implements ImageStorage {
  private readonly urlPrefix: string;

  constructor(config: CloudinaryConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
    this.urlPrefix = `https://res.cloudinary.com/${config.cloudName}/`;
  }

  upload(buffer: Buffer, { folder }: { folder: string }): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          allowed_formats: ["jpg", "png", "webp"],
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Cloudinary returned no result"));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
          });
        },
      );
      stream.end(buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  }

  ownsUrl(url: string): boolean {
    return url.startsWith(this.urlPrefix);
  }
}