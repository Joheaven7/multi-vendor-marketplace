import type { RequestHandler } from "express";
import * as uploadService from "../services/upload.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { uploadPurposeSchema } from "../validators/catalog.validator";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";

export const uploadImage: RequestHandler = async (req, res) => {
  const purpose = uploadPurposeSchema.parse(req.body?.purpose);
  if (!req.file) throw AppError.badRequest('No image was uploaded. Send it in the form field "file".');

  const user = getAuthUser(req);
  const image = await uploadService.uploadImage(
    { id: user.id, role: user.role },
    purpose,
    req.file.buffer,
  );
  sendSuccess(res, { image }, 201);
};