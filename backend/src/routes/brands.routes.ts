import { Router } from "express";
import * as brandController from "../controllers/brand.controller";

const router = Router();

router.get("/", brandController.listPublic);

export default router;