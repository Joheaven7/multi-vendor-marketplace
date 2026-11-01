import { Router } from "express";
import * as publicCatalog from "../controllers/public-catalog.controller";
import { validate } from "../middleware/validate.middleware";
import { slugParamsSchema } from "../validators/public.validator";

const router = Router();

router.get("/:slug", validate({ params: slugParamsSchema }), publicCatalog.getStore);

export default router;