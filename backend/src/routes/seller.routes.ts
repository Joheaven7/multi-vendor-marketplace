import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";
import * as productController from "../controllers/seller-product.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { requireActiveSeller } from "../middleware/seller.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamsSchema } from "../validators/common.validator";
import {
  inventoryQuerySchema,
  productSchema,
  sellerProductListQuerySchema,
  stockSchema,
  variantParamsSchema,
} from "../validators/product.validator";

const router = Router();

// Everything under /api/seller needs a signed-in seller whose store is ACTIVE.
router.use(authenticate, authorize("SELLER"), requireActiveSeller);

router.get(
  "/products",
  validate({ query: sellerProductListQuerySchema }),
  productController.list,
);
router.post("/products", validate({ body: productSchema }), productController.create);
router.get("/products/:id", validate({ params: idParamsSchema }), productController.get);
router.put(
  "/products/:id",
  validate({ params: idParamsSchema, body: productSchema }),
  productController.update,
);
router.delete("/products/:id", validate({ params: idParamsSchema }), productController.remove);
router.post("/products/:id/submit", validate({ params: idParamsSchema }), productController.submit);
router.post(
  "/products/:id/withdraw",
  validate({ params: idParamsSchema }),
  productController.withdraw,
);

router.get("/inventory", validate({ query: inventoryQuerySchema }), inventoryController.list);
router.patch(
  "/inventory/:variantId",
  validate({ params: variantParamsSchema, body: stockSchema }),
  inventoryController.setStock,
);

export default router;