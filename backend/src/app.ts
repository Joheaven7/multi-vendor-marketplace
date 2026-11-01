import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env, isProduction } from "./config/env";
import { logger } from "./utils/logger";
import routes from "./routes";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { originCheck } from "./middleware/originCheck.middleware";
import { notFoundHandler } from "./middleware/notFound.middleware";
import { errorHandler } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  if (isProduction) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use("/api", originCheck, apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}