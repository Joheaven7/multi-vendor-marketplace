import type { RequestHandler } from "express";
import * as categoryService from "../services/category.service";
import { getIdParam, getSlugParam } from "../utils/params";
import { sendSuccess } from "../utils/response";

export const listPublic: RequestHandler = async (_req, res) => {
  sendSuccess(res, { categories: await categoryService.listTree({ admin: false }) });
};

export const getPublic: RequestHandler = async (req, res) => {
  sendSuccess(res, await categoryService.getPublicCategoryBySlug(getSlugParam(req)));
};

export const listAdmin: RequestHandler = async (_req, res) => {
  sendSuccess(res, { categories: await categoryService.listTree({ admin: true }) });
};

export const create: RequestHandler = async (req, res) => {
  sendSuccess(res, { category: await categoryService.createCategory(req.body) }, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendSuccess(res, { category: await categoryService.updateCategory(getIdParam(req), req.body) });
};

export const remove: RequestHandler = async (req, res) => {
  await categoryService.deleteCategory(getIdParam(req));
  sendSuccess(res, { message: "Category deleted" });
};