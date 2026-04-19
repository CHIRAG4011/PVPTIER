import { Router, type IRouter, type Request, type Response } from "express";
import { Announcement } from "@workspace/db";
import { CreateAnnouncementBody, ListAnnouncementsQueryParams } from "@workspace/api-zod";
import { requireAdmin, optionalAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/announcements", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = ListAnnouncementsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const [announcements, total] = await Promise.all([
    Announcement.find().sort({ isPinned: -1, createdAt: -1 }).skip(offset).limit(limit),
    Announcement.countDocuments(),
  ]);

  res.json({
    announcements: announcements.map((a: any) => ({ ...a.toJSON(), id: a._id.toString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/announcements", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const announcement = await Announcement.create({
    title: parsed.data.title,
    content: parsed.data.content,
    type: parsed.data.type,
    authorId: user.userId,
    authorUsername: user.username,
    isPinned: parsed.data.isPinned ?? false,
  });

  res.status(201).json({ ...announcement.toJSON(), id: announcement._id.toString() });
});

router.delete("/announcements/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid announcement ID" });
    return;
  }

  await Announcement.findByIdAndDelete(id);
  res.json({ success: true, message: "Announcement deleted" });
});

export default router;
