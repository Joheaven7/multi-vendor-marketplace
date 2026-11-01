import type { RequestHandler } from "express";
import * as sellerService from "../services/seller.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { sendSuccess } from "../utils/response";

const sellerId = (params: unknown) => (params as { id: string }).id;

export const listSellers: RequestHandler = async (_req, res) => {
  const result = await sellerService.listSellers(res.locals.query);
  sendSuccess(res, result);
};

export const getSeller: RequestHandler = async (req, res) => {
  const seller = await sellerService.getSellerForAdmin(sellerId(req.params));
  sendSuccess(res, { seller });
};

export const approveSeller: RequestHandler = async (req, res) => {
  const seller = await sellerService.approveSeller(sellerId(req.params), getAuthUser(req).id);
  sendSuccess(res, { seller });
};

export const rejectSeller: RequestHandler = async (req, res) => {
  const seller = await sellerService.rejectSeller(
    sellerId(req.params),
    getAuthUser(req).id,
    req.body.reason,
  );
  sendSuccess(res, { seller });
};

export const suspendSeller: RequestHandler = async (req, res) => {
  const seller = await sellerService.suspendSeller(
    sellerId(req.params),
    getAuthUser(req).id,
    req.body.reason,
  );
  sendSuccess(res, { seller });
};

export const reactivateSeller: RequestHandler = async (req, res) => {
  const seller = await sellerService.reactivateSeller(sellerId(req.params), getAuthUser(req).id);
  sendSuccess(res, { seller });
};