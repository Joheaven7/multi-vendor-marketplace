import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { validate } from "../middleware/validate.middleware";
import { slugParamsSchema } from "../validators/public.validator";

const router = Router();

router.get("/", categoryController.listPublic);
router.get("/:slug", validate({ params: slugParamsSchema }), categoryController.getPublic);

export default router;