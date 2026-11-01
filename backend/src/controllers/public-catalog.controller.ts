import type { RequestHandler } from "express";
import { getHomeContent } from "../services/home.service";
import { getPublicProduct, listPublicProducts } from "../services/public-product.service";
import { getPublicStore } from "../services/store.service";
import { getSlugParam } from "../utils/params";
import { sendSuccess } from "../utils/response";

export const listProducts: RequestHandler = async (_req, res) => {
  sendSuccess(res, await listPublicProducts(res.locals.query));
};

export const getProduct: RequestHandler = async (req, res) => {
  sendSuccess(res, { product: await getPublicProduct(getSlugParam(req)) });
};

export const getStore: RequestHandler = async (req, res) => {
  sendSuccess(res, { store: await getPublicStore(getSlugParam(req)) });
};

export const getHome: RequestHandler = async (_req, res) => {
  sendSuccess(res, await getHomeContent());
};