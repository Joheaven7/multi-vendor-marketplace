import type { RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "../utils/image";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return callback(
        new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG and WebP images are allowed"),
      );
    }
    callback(null, true);
  },
});

/** Accepts one image in the multipart field "file". Turns multer errors into API errors. */
export const uploadSingleImage: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError(413, "FILE_TOO_LARGE", "Image must be 5 MB or smaller"));
      }
      return next(AppError.badRequest(error.message));
    }
    next(error);
  });
};