import { Router } from "express";
import * as publicCatalog from "../controllers/public-catalog.controller";
import { validate } from "../middleware/validate.middleware";
import { publicProductQuerySchema, slugParamsSchema } from "../validators/public.validator";

const router = Router();

router.get("/", validate({ query: publicProductQuerySchema }), publicCatalog.listProducts);
router.get("/:slug", validate({ params: slugParamsSchema }), publicCatalog.getProduct);

export default router;