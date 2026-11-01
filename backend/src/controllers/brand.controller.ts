import type { RequestHandler } from "express";
import * as brandService from "../services/brand.service";
import { getIdParam } from "../utils/params";
import { sendSuccess } from "../utils/response";

export const listPublic: RequestHandler = async (_req, res) => {
  sendSuccess(res, { brands: await brandService.listBrands({ admin: false }) });
};

export const listAdmin: RequestHandler = async (_req, res) => {
  sendSuccess(res, { brands: await brandService.listBrands({ admin: true }) });
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, { brand: await brandService.createBrand(req.body) }, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendSuccess(res, { brand: await brandService.updateBrand(getIdParam(req), req.body) });
};

export const remove: RequestHandler = async (req, res) => {
  await brandService.deleteBrand(getIdParam(req));
  sendSuccess(res, { message: "Brand deleted" });
};