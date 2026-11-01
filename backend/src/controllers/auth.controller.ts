import type { RequestHandler } from "express";
import * as authService from "../services/auth.service";
import { getAuthUser } from "../middleware/auth.middleware";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../utils/cookies";
import { sendSuccess } from "../utils/response";

const userAgent = (req: Parameters<RequestHandler>[0]) => req.get("user-agent")?.slice(0, 200);

export const register: RequestHandler = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body, userAgent(req));
  setAuthCookies(res, { accessToken, refreshToken });
  sendSuccess(res, { user }, 201);
};

export const login: RequestHandler = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, userAgent(req));
  setAuthCookies(res, { accessToken, refreshToken });
  sendSuccess(res, { user });
};

export const refresh: RequestHandler = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await authService.refresh(
      req.cookies?.[REFRESH_COOKIE],
      userAgent(req),
    );
    setAuthCookies(res, { accessToken, refreshToken });
    sendSuccess(res, { user });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  sendSuccess(res, { message: "Logged out" });
};

export const me: RequestHandler = async (req, res) => {
  const user = await authService.getMe(getAuthUser(req).id);
  sendSuccess(res, { user });
};