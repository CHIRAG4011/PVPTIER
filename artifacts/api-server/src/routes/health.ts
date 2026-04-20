import { Router, type IRouter } from "express";
import mongoose from "mongoose";

const router: IRouter = Router();

function healthResponse() {
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? "connected" :
    dbState === 2 ? "connecting" :
    dbState === 3 ? "disconnecting" : "disconnected";

  return {
    status: dbStatus === "connected" ? "ok" : "degraded",
    db: dbStatus,
    mongoUriSet: !!process.env.MONGODB_URI,
    sessionSecretSet: !!process.env.SESSION_SECRET,
    env: process.env.NODE_ENV ?? "unknown",
    ts: new Date().toISOString(),
  };
}

router.get("/health", (_req, res) => {
  const data = healthResponse();
  res.status(data.status === "ok" ? 200 : 503).json(data);
});

router.get("/healthz", (_req, res) => {
  const data = healthResponse();
  res.status(data.status === "ok" ? 200 : 503).json(data);
});

export default router;
