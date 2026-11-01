import type { ImageStorage, UploadedImage } from "../services/storage/image-storage";

/** In-memory ImageStorage for tests. Records uploads and deletions so tests can check them. */
class FakeImageStorage implements ImageStorage {
  uploads: UploadedImage[] = [];
  deleted: string[] = [];
  private counter = 0;

  async upload(_buffer: Buffer, { folder }: { folder: string }): Promise<UploadedImage> {
    this.counter += 1;
    const publicId = `${folder}/image-${this.counter}`;
    const image: UploadedImage = {
      url: `https://test-cdn.example/${publicId}.jpg`,
      publicId,
      width: 800,
      height: 600,
      bytes: 1234,
      format: "jpg",
    };
    this.uploads.push(image);
    return image;
  }

  async delete(publicId: string): Promise<void> {
    this.deleted.push(publicId);
  }

  ownsUrl(url: string): boolean {
    return url.startsWith("https://test-cdn.example/");
  }

  /** An image reference that this storage will accept, without going through an upload. */
  ref(folder: string, name = "photo") {
    const publicId = `${folder}/${name}`;
    return { url: `https://test-cdn.example/${publicId}.jpg`, publicId };
  }

  reset() {
    this.uploads = [];
    this.deleted = [];
    this.counter = 0;
  }
}

export const fakeStorage = new FakeImageStorage();