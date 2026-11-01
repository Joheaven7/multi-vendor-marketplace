import { Router } from "express";
import * as publicCatalog from "../controllers/public-catalog.controller";

const router = Router();

router.get("/", publicCatalog.getHome);

export default router;