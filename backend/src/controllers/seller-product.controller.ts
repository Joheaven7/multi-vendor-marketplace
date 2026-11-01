import type { RequestHandler } from "express";
import * as productService from "../services/product.service";
import { getSellerContext } from "../middleware/seller.middleware";
import { getIdParam } from "../utils/params";
import { sendSuccess } from "../utils/response";

export const list: RequestHandler = async (req, res) => {
  sendSuccess(res, await productService.listSellerProducts(getSellerContext(req).id, res.locals.query));
};

export const get: RequestHandler = async (req, res) => {
  const product = await productService.getSellerProduct(getSellerContext(req).id, getIdParam(req));
  sendSuccess(res, { product });
};

export const create: RequestHandler = async (req, res) => {
  const product = await productService.createProduct(getSellerContext(req).id, req.body);
  sendSuccess(res, { product }, 201);
};

export const update: RequestHandler = async (req, res) => {
  const product = await productService.updateProduct(getSellerContext(req).id, getIdParam(req), req.body);
  sendSuccess(res, { product });
};

export const remove: RequestHandler = async (req, res) => {
  await productService.deleteProduct(getSellerContext(req).id, getIdParam(req));
  sendSuccess(res, { message: "Product deleted" });
};

export const submit: RequestHandler = async (req, res) => {
  const product = await productService.submitProduct(getSellerContext(req).id, getIdParam(req));
  sendSuccess(res, { product });
};

export const withdraw: RequestHandler = async (req, res) => {
  const product = await productService.withdrawProduct(getSellerContext(req).id, getIdParam(req));
  sendSuccess(res, { product });
};