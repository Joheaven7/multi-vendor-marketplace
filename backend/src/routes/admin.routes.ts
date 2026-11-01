import { Router } from "express";
import * as adminBrands from "../controllers/brand.controller";
import * as adminCategories from "../controllers/category.controller";
import * as adminProducts from "../controllers/admin-products.controller";
import * as adminSellers from "../controllers/admin-sellers.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createBrandSchema,
  createCategorySchema,
  updateBrandSchema,
  updateCategorySchema,
} from "../validators/catalog.validator";
import { idParamsSchema } from "../validators/common.validator";
import { adminProductListQuerySchema } from "../validators/product.validator";
import { adminSellerListQuerySchema, reasonSchema } from "../validators/seller.validator";

const router = Router();

// Every admin route requires a signed-in ADMIN.
router.use(authenticate, authorize("ADMIN"));

/* --------------------------------- sellers --------------------------------- */

router.get("/sellers", validate({ query: adminSellerListQuerySchema }), adminSellers.listSellers);
router.get("/sellers/:id", validate({ params: idParamsSchema }), adminSellers.getSeller);
router.patch(
  "/sellers/:id/approve",
  validate({ params: idParamsSchema }),
  adminSellers.approveSeller,
);
router.patch(
  "/sellers/:id/reject",
  validate({ params: idParamsSchema, body: reasonSchema }),
  adminSellers.rejectSeller,
);
router.patch(
  "/sellers/:id/suspend",
  validate({ params: idParamsSchema, body: reasonSchema }),
  adminSellers.suspendSeller,
);
router.patch(
  "/sellers/:id/reactivate",
  validate({ params: idParamsSchema }),
  adminSellers.reactivateSeller,
);

/* -------------------------------- categories ------------------------------- */

router.get("/categories", adminCategories.listAdmin);
router.post("/categories", validate({ body: createCategorySchema }), adminCategories.create);
router.put(
  "/categories/:id",
  validate({ params: idParamsSchema, body: updateCategorySchema }),
  adminCategories.update,
);
router.delete("/categories/:id", validate({ params: idParamsSchema }), adminCategories.remove);

/* ---------------------------------- brands --------------------------------- */

router.get("/brands", adminBrands.listAdmin);
router.post("/brands", validate({ body: createBrandSchema }), adminBrands.create);
router.put(
  "/brands/:id",
  validate({ params: idParamsSchema, body: updateBrandSchema }),
  adminBrands.update,
);
router.delete("/brands/:id", validate({ params: idParamsSchema }), adminBrands.remove);

/* --------------------------------- products -------------------------------- */

router.get("/products", validate({ query: adminProductListQuerySchema }), adminProducts.list);
router.get("/products/:id", validate({ params: idParamsSchema }), adminProducts.get);
router.patch(
  "/products/:id/approve",
  validate({ params: idParamsSchema }),
  adminProducts.approve,
);
router.patch(
  "/products/:id/reject",
  validate({ params: idParamsSchema, body: reasonSchema }),
  adminProducts.reject,
);
router.patch(
  "/products/:id/hide",
  validate({ params: idParamsSchema, body: reasonSchema }),
  adminProducts.hide,
);
router.patch(
  "/products/:id/unhide",
  validate({ params: idParamsSchema }),
  adminProducts.unhide,
);
router.delete("/products/:id", validate({ params: idParamsSchema }), adminProducts.remove);

export default router;