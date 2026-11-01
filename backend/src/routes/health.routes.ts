import { Router } from "express";
import mongoose from "mongoose";
import { sendSuccess } from "../utils/response";

const router = Router();

const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

router.get("/", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: DB_STATES[mongoose.connection.readyState] ?? "unknown",
  });
});

export default router;