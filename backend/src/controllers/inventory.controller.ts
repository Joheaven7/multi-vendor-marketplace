import type { RequestHandler } from "express";
import * as inventoryService from "../services/inventory.service";
import { getSellerContext } from "../middleware/seller.middleware";
import { sendSuccess } from "../utils/response";

export const list: RequestHandler = async (req, res) => {
  sendSuccess(res, await inventoryService.listInventory(getSellerContext(req).id, res.locals.query));
};

export const setStock: RequestHandler = async (req, res) => {
  const { variantId } = req.params as { variantId: string };
  const item = await inventoryService.setStock(getSellerContext(req).id, variantId, req.body.stock);
  sendSuccess(res, { item });
};