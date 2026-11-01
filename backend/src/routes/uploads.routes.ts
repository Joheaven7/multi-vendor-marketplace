import { Router } from "express";
import * as uploadController from "../controllers/upload.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { uploadSingleImage } from "../middleware/upload.middleware";

const router = Router();

// Authenticate before parsing the file, so anonymous callers cannot make the server buffer uploads.
router.post(
  "/images",
  authenticate,
  authorize("SELLER", "ADMIN"),
  uploadSingleImage,
  uploadController.uploadImage,
);

export default router;