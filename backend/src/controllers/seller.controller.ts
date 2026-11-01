import type { RequestHandler } from "express";
import * as sellerService from "../services/seller.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { sendSuccess } from "../utils/response";

export const apply: RequestHandler = async (req, res) => {
  const user = getAuthUser(req);
  const seller = await sellerService.apply({ id: user.id, role: user.role }, req.body);
  sendSuccess(res, { seller }, 201);
};

export const getMine: RequestHandler = async (req, res) => {
  const seller = await sellerService.getMine(getAuthUser(req).id);
  sendSuccess(res, { seller });
};