import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, submissionsTable, playersTable, adminLogsTable } from "@workspace/db";
import { CreateSubmissionBody, ListSubmissionsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.post("/submissions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { opponentUsername, gamemode, result, evidence } = parsed.data;
  const [submission] = await db.insert(submissionsTable).values({
    submitterId: user.userId,
    submitterUsername: user.username,
    opponentUsername,
    gamemode,
    result,
    status: "pending",
    evidence: evidence ?? null,
  }).returning();

  res.status(201).json(submission);
});

router.get("/submissions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = ListSubmissionsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const submissions = await db.select().from(submissionsTable)
    .orderBy(desc(submissionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const all = await db.select().from(submissionsTable);

  res.json({
    submissions,
    total: all.length,
    page,
    totalPages: Math.ceil(all.length / limit),
  });
});

router.post("/submissions/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid submission ID" });
    return;
  }

  const [submission] = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id));
  if (!submission) {
    res.status(404).json({ error: "not_found", message: "Submission not found" });
    return;
  }

  await db.update(submissionsTable).set({ status: "approved", reviewedBy: adminUser.userId }).where(eq(submissionsTable.id, id));

  const [winner] = await db.select().from(playersTable).where(eq(playersTable.minecraftUsername, submission.submitterUsername));
  if (winner) {
    const eloChange = 25;
    await db.update(playersTable).set({
      wins: winner.wins + 1,
      elo: winner.elo + eloChange,
      winStreak: winner.winStreak + 1,
    }).where(eq(playersTable.id, winner.id));
  }

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "approve_submission",
    target: `submission:${id}`,
    details: `Approved submission by ${submission.submitterUsername}`,
  });

  res.json({ success: true, message: "Submission approved" });
});

router.post("/submissions/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid submission ID" });
    return;
  }

  await db.update(submissionsTable).set({ status: "rejected", reviewedBy: adminUser.userId }).where(eq(submissionsTable.id, id));

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "reject_submission",
    target: `submission:${id}`,
    details: `Rejected submission #${id}`,
  });

  res.json({ success: true, message: "Submission rejected" });
});

export default router;
