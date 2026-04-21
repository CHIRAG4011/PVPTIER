import { Router, type IRouter, type Request, type Response } from "express";
import { Submission, Player, AdminLog, User, Match } from "@workspace/db";
import { ListSubmissionsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";
import { z } from "zod";

const router: IRouter = Router();

const CreateSubmissionBody = z.object({
  opponentUsername: z.string().min(1),
  gamemode: z.string().min(1),
  evidence: z.string().url(),
});

router.post("/submissions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { opponentUsername, gamemode, evidence } = parsed.data;

  const opponent = await Player.findOne({ minecraftUsername: { $regex: `^${opponentUsername}$`, $options: "i" } });
  if (!opponent) {
    res.status(404).json({ error: "player_not_found", message: `Player "${opponentUsername}" not found in the system. Make sure you enter their exact Minecraft IGN.` });
    return;
  }

  const submission = await Submission.create({
    submitterId: user.userId,
    submitterUsername: user.username,
    opponentUsername: opponent.minecraftUsername,
    gamemode,
    result: null,
    status: "pending",
    evidence,
  });

  res.status(201).json({ ...submission.toJSON(), id: submission._id.toString() });
});

router.get("/submissions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = ListSubmissionsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = parsed.success ? parsed.data.status : undefined;

  const filter: Record<string, unknown> = {};
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

const ApproveBody = z.object({
  winner: z.enum(["submitter", "opponent"]),
});

router.post("/submissions/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid submission ID" });
    return;
  }

  const parsed = ApproveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "You must pick the winner (submitter or opponent)." });
    return;
  }

  const submission = await Submission.findById(id);
  if (!submission) {
    res.status(404).json({ error: "not_found", message: "Submission not found" });
    return;
  }

  const submitterUser = await User.findById(submission.submitterId);
  const submitterMinecraftIGN = submitterUser?.minecraftUsername || submission.submitterUsername;

  const submitterPlayer = await Player.findOne({ minecraftUsername: { $regex: `^${submitterMinecraftIGN}$`, $options: "i" } });
  const opponentPlayer = await Player.findOne({ minecraftUsername: { $regex: `^${submission.opponentUsername}$`, $options: "i" } });

  const winner = parsed.data.winner === "submitter" ? submitterPlayer : opponentPlayer;
  const loser = parsed.data.winner === "submitter" ? opponentPlayer : submitterPlayer;
  const winnerUsername = parsed.data.winner === "submitter" ? submitterMinecraftIGN : submission.opponentUsername;
  const loserUsername = parsed.data.winner === "submitter" ? submission.opponentUsername : submitterMinecraftIGN;

  await Submission.findByIdAndUpdate(id, {
    status: "approved",
    reviewedBy: adminUser.userId,
    result: parsed.data.winner === "submitter" ? "win" : "loss",
  });

  const eloChange = 25;

  if (winner) {
    await Player.findByIdAndUpdate(winner._id, { $inc: { wins: 1, elo: eloChange, winStreak: 1 } });
  }
  if (loser) {
    await Player.findByIdAndUpdate(loser._id, { $inc: { losses: 1, elo: -eloChange, winStreak: 0 } });
  }

  await Match.create({
    winnerId: winner?._id?.toString() ?? "unknown",
    loserId: loser?._id?.toString() ?? "unknown",
    winnerUsername,
    loserUsername,
    gamemode: submission.gamemode,
    eloChange,
    playedAt: new Date(),
  });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "approve_submission",
    target: `submission:${id}`,
    details: `Approved submission by ${submission.submitterUsername} — ${winnerUsername} defeated ${loserUsername}`,
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
