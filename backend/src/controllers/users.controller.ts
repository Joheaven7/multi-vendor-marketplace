import type { RequestHandler } from "express";
import * as authService from "../services/auth.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { clearAuthCookies } from "../utils/cookies";
import { sendSuccess } from "../utils/response";

export const updateMe: RequestHandler = async (req, res) => {
  const user = await authService.updateProfile(getAuthUser(req).id, req.body);
  sendSuccess(res, { user });
};

export const changePassword: RequestHandler = async (req, res) => {
  await authService.changePassword(getAuthUser(req).id, req.body);
  clearAuthCookies(res);
  sendSuccess(res, { message: "Password changed. Please sign in again." });
};