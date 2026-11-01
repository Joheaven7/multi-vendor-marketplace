import type { RequestHandler } from "express";
import * as adminProductService from "../services/admin-product.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { getIdParam } from "../utils/params";
import { sendSuccess } from "../utils/response";

export const list: RequestHandler = async (_req, res) => {
  sendSuccess(res, await adminProductService.listProducts(res.locals.query));
};

export const get: RequestHandler = async (req, res) => {
  sendSuccess(res, { product: await adminProductService.getProduct(getIdParam(req)) });
};

export const approve: RequestHandler = async (req, res) => {
  const product = await adminProductService.approveProduct(getIdParam(req), getAuthUser(req).id);
  sendSuccess(res, { product });
};

export const reject: RequestHandler = async (req, res) => {
  const product = await adminProductService.rejectProduct(
    getIdParam(req),
    getAuthUser(req).id,
    req.body.reason,
  );
  sendSuccess(res, { product });
};

export const hide: RequestHandler = async (req, res) => {
  const product = await adminProductService.hideProduct(
    getIdParam(req),
    getAuthUser(req).id,
    req.body.reason,
  );
  sendSuccess(res, { product });
};

export const unhide: RequestHandler = async (req, res) => {
  const product = await adminProductService.unhideProduct(getIdParam(req), getAuthUser(req).id);
  sendSuccess(res, { product });
};

export const remove: RequestHandler = async (req, res) => {
  await adminProductService.deleteProduct(getIdParam(req));
  sendSuccess(res, { message: "Product deleted" });
};