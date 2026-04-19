import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { CreateAnnouncementBody, ListAnnouncementsQueryParams } from "@workspace/api-zod";
import { requireAdmin, optionalAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/announcements", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const parsed = ListAnnouncementsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const announcements = await db.select().from(announcementsTable)
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const all = await db.select().from(announcementsTable);

  res.json({
    announcements,
    total: all.length,
    page,
    totalPages: Math.ceil(all.length / limit),
  });
});

router.post("/announcements", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [announcement] = await db.insert(announcementsTable).values({
    title: parsed.data.title,
    content: parsed.data.content,
    type: parsed.data.type,
    authorId: user.userId,
    authorUsername: user.username,
    isPinned: parsed.data.isPinned ?? false,
  }).returning();

  res.status(201).json(announcement);
});

router.delete("/announcements/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid announcement ID" });
    return;
  }

  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.json({ success: true, message: "Announcement deleted" });
});

export default router;
