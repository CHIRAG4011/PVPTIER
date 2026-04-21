import { Router, type IRouter, type Request, type Response } from "express";
import { Notification } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const items = await Notification.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(30);
  res.json({
    notifications: items.map((n: any) => ({ ...n.toJSON(), id: n._id.toString() })),
  });
});

router.get("/notifications/unread-count", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const count = await Notification.countDocuments({ userId: user.userId, read: false });
  res.json({ count });
});

router.post("/notifications/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id" }); return;
  }
  await Notification.updateOne({ _id: id, userId: user.userId }, { $set: { read: true } });
  res.json({ success: true });
});

router.post("/notifications/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  await Notification.updateMany({ userId: user.userId, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

export default router;
