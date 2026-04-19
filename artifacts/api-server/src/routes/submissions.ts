import { Router, type IRouter, type Request, type Response } from "express";
import { Submission, Player, AdminLog } from "@workspace/db";
import { CreateSubmissionBody, ListSubmissionsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

router.post("/submissions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { opponentUsername, gamemode, result, evidence } = parsed.data;
  const submission = await Submission.create({
    submitterId: user.userId,
    submitterUsername: user.username,
    opponentUsername,
    gamemode,
    result,
    status: "pending",
    evidence: evidence ?? null,
  });

  res.status(201).json({ ...submission.toJSON(), id: submission._id.toString() });
});

router.get("/submissions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = ListSubmissionsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = parsed.success ? parsed.data.status : undefined;

  const filter: any = {};
  if (status) filter.status = status;

  const [submissions, total] = await Promise.all([
    Submission.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    Submission.countDocuments(filter),
  ]);

  res.json({
    submissions: submissions.map((s: any) => ({ ...s.toJSON(), id: s._id.toString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/submissions/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid submission ID" });
    return;
  }

  const submission = await Submission.findById(id);
  if (!submission) {
    res.status(404).json({ error: "not_found", message: "Submission not found" });
    return;
  }

  await Submission.findByIdAndUpdate(id, { status: "approved", reviewedBy: adminUser.userId });

  const winner = await Player.findOne({ minecraftUsername: submission.submitterUsername });
  if (winner) {
    await Player.findByIdAndUpdate(winner._id, {
      $inc: { wins: 1, elo: 25, winStreak: 1 },
    });
  }

  await AdminLog.create({
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
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid submission ID" });
    return;
  }

  await Submission.findByIdAndUpdate(id, { status: "rejected", reviewedBy: adminUser.userId });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "reject_submission",
    target: `submission:${id}`,
    details: `Rejected submission #${id}`,
  });

  res.json({ success: true, message: "Submission rejected" });
});

export default router;
