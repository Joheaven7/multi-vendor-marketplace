import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { isProduction } from "../config/env";

type ErrorBody = { code: string; message: string; details?: unknown };

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let body: ErrorBody = { code: "INTERNAL_ERROR", message: "Something went wrong" };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    body = { code: err.code, message: err.message, details: err.details };
  } else if (err instanceof ZodError) {
    statusCode = 400;
    body = {
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    body = {
      code: "VALIDATION_ERROR",
      message: "Invalid data",
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    body = { code: "INVALID_ID", message: `Invalid value for ${err.path}` };
  } else if (err?.code === 11000) {
    statusCode = 409;
    body = {
      code: "CONFLICT",
      message: "Duplicate value",
      details: Object.keys(err.keyValue ?? {}),
    };
  } else if (err?.type === "entity.parse.failed") {
    statusCode = 400;
    body = { code: "INVALID_JSON", message: "Request body is not valid JSON" };
  }

  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled error");
    if (isProduction) body = { code: "INTERNAL_ERROR", message: "Something went wrong" };
    else body.message = err?.message ?? body.message;
  }

  res.status(statusCode).json({ success: false, error: body });
};