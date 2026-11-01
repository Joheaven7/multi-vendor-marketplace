import request from "supertest";
import { describe, expect, it } from "vitest";
import { setImageStorage } from "../services/storage";
import { createAdminAgent, createSellerUser, createUser, app, loginAs } from "./helpers";
import { fakeStorage } from "./fake-storage";

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (extraBytes = 64) => Buffer.concat([PNG_HEADER, Buffer.alloc(extraBytes)]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

describe("POST /api/uploads/images", () => {
  it("requires a signed-in seller or admin", async () => {
    await request(app).post("/api/uploads/images").field("purpose", "catalog").expect(401);

    const customer = await createUser();
    const agent = await loginAs(customer.email);
    await agent
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", png(), { filename: "a.png", contentType: "image/png" })
      .expect(403);
  });

  it("lets an admin upload catalog images", async () => {
    const admin = await createAdminAgent();
    const res = await admin
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", png(), { filename: "category.png", contentType: "image/png" })
      .expect(201);

    expect(res.body.data.image.publicId).toMatch(/^marketplace\/catalog\//);
    expect(fakeStorage.uploads).toHaveLength(1);
  });

  it("puts a seller's product images in that seller's own folder", async () => {
    const { user, seller } = await createSellerUser("ACTIVE");
    const agent = await loginAs(user.email);

    const res = await agent
      .post("/api/uploads/images")
      .field("purpose", "product")
      .attach("file", Buffer.concat([JPEG_HEADER, Buffer.alloc(64)]), {
        filename: "shoe.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);

    expect(res.body.data.image.publicId).toMatch(
      new RegExp(`^marketplace/products/${seller.id}/`),
    );
  });

  it("forbids uploading outside the caller's role", async () => {
    const admin = await createAdminAgent();
    await admin
      .post("/api/uploads/images")
      .field("purpose", "product")
      .attach("file", png(), { filename: "a.png", contentType: "image/png" })
      .expect(403);

    const { user } = await createSellerUser("ACTIVE");
    const seller = await loginAs(user.email);
    await seller
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", png(), { filename: "a.png", contentType: "image/png" })
      .expect(403);
  });

  it("refuses a suspended seller", async () => {
    const { user } = await createSellerUser("SUSPENDED");
    const agent = await loginAs(user.email);

    const res = await agent
      .post("/api/uploads/images")
      .field("purpose", "product")
      .attach("file", png(), { filename: "a.png", contentType: "image/png" })
      .expect(403);
    expect(res.body.error.code).toBe("SELLER_NOT_ACTIVE");
  });

  it("rejects a file whose bytes are not an image, even if named .jpg", async () => {
    const admin = await createAdminAgent();
    const res = await admin
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", Buffer.from("this is a text file pretending to be a picture"), {
        filename: "fake.jpg",
        contentType: "image/jpeg",
      })
      .expect(415);

    expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(fakeStorage.uploads).toHaveLength(0);
  });

  it("rejects non-image content types", async () => {
    const admin = await createAdminAgent();
    await admin
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "doc.pdf", contentType: "application/pdf" })
      .expect(415);
  });

  it("rejects files over 5 MB", async () => {
    const admin = await createAdminAgent();
    const res = await admin
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", png(5 * 1024 * 1024 + 1024), { filename: "huge.png", contentType: "image/png" })
      .expect(413);

    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("requires a file and a valid purpose", async () => {
    const admin = await createAdminAgent();

    await admin.post("/api/uploads/images").field("purpose", "catalog").expect(400);
    await admin
      .post("/api/uploads/images")
      .field("purpose", "banner")
      .attach("file", png(), { filename: "a.png", contentType: "image/png" })
      .expect(400);
  });

  it("answers 503 when image storage is not configured", async () => {
    setImageStorage(undefined); // falls back to the real default, which is unconfigured in tests
    const admin = await createAdminAgent();

    const res = await admin
      .post("/api/uploads/images")
      .field("purpose", "catalog")
      .attach("file", png(), { filename: "a.png", contentType: "image/png" })
      .expect(503);
    expect(res.body.error.code).toBe("UPLOADS_NOT_CONFIGURED");
  });
});