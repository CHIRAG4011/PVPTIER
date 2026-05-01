import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { connectDB } from "@workspace/db";

const router: IRouter = Router();

async function healthResponse() {
  let dbError: string | null = null;

  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err: unknown) {
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? "connected" :
    dbState === 2 ? "connecting" :
    dbState === 3 ? "disconnecting" : "disconnected";

  return {
    status: dbStatus === "connected" ? "ok" : "degraded",
    db: dbStatus,
    dbError,
    mongoUriSet: !!process.env.MONGODB_URI,
    sessionSecretSet: !!process.env.SESSION_SECRET,
    env: process.env.NODE_ENV ?? "unknown",
    ts: new Date().toISOString(),
  };
}

router.get("/health", async (_req, res) => {
  const data = await healthResponse();
  res.status(data.status === "ok" ? 200 : 503).json(data);
});

router.get("/healthz", async (_req, res) => {
  const data = await healthResponse();
  res.status(data.status === "ok" ? 200 : 503).json(data);
});

export default router;
