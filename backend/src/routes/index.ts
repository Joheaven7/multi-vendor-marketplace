import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import sellersRoutes from "./sellers.routes";
import sellerAreaRoutes from "./seller.routes";
import adminRoutes from "./admin.routes";
import categoriesRoutes from "./categories.routes";
import brandsRoutes from "./brands.routes";
import uploadsRoutes from "./uploads.routes";
import productsRoutes from "./products.routes";
import storesRoutes from "./stores.routes";
import homeRoutes from "./home.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/sellers", sellersRoutes); // apply to become a seller
router.use("/seller", sellerAreaRoutes); // the approved seller's own catalog and inventory
router.use("/admin", adminRoutes);
router.use("/uploads", uploadsRoutes);

// Public storefront (no login needed)
router.use("/categories", categoriesRoutes);
router.use("/brands", brandsRoutes);
router.use("/products", productsRoutes);
router.use("/stores", storesRoutes);
router.use("/home", homeRoutes);

export default router;