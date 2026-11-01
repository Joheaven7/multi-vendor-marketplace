import { Router } from "express";
import * as sellerController from "../controllers/seller.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { sellerApplicationSchema } from "../validators/seller.validator";

const router = Router();

router.use(authenticate);

router.post("/apply", validate({ body: sellerApplicationSchema }), sellerController.apply);
router.get("/me", sellerController.getMine);

export default router;