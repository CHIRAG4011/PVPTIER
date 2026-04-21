import { Router, type IRouter, type Request, type Response } from "express";
import { Challenge, Player, Notification, User } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";
import { z } from "zod";

const router: IRouter = Router();

const CreateChallengeBody = z.object({
  opponentUsername: z.string().min(1),
  gamemode: z.string().min(1),
  server: z.string().min(1),
  scheduledTime: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
});

router.post("/challenges", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateChallengeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { opponentUsername, gamemode, server, scheduledTime, notes } = parsed.data;

  const scheduled = new Date(scheduledTime);
  if (Number.isNaN(scheduled.getTime())) {
    res.status(400).json({ error: "invalid_time", message: "Scheduled time is invalid." });
    return;
  }

  const challengerUser = await User.findById(user.userId);
  const challengerMc = challengerUser?.minecraftUsername;
  if (!challengerMc) {
    res.status(400).json({ error: "no_minecraft_username", message: "Set your Minecraft IGN in your profile before creating a match." });
    return;
  }

  if (challengerMc.toLowerCase() === opponentUsername.toLowerCase()) {
    res.status(400).json({ error: "self_challenge", message: "You can't challenge yourself." });
    return;
  }

  const opponentPlayer = await Player.findOne({
    minecraftUsername: { $regex: `^${opponentUsername}$`, $options: "i" },
  });
  if (!opponentPlayer) {
    res.status(404).json({ error: "player_not_found", message: `Player "${opponentUsername}" is not registered.` });
    return;
  }

  const challenge = await Challenge.create({
    challengerId: user.userId,
    challengerUsername: user.username,
    challengerMcUsername: challengerMc,
    opponentUserId: opponentPlayer.userId ?? null,
    opponentUsername: opponentPlayer.minecraftUsername,
    gamemode,
    server,
    scheduledTime: scheduled,
    notes: notes ?? null,
    status: "pending",
  });

  if (opponentPlayer.userId) {
    await Notification.create({
      userId: opponentPlayer.userId,
      type: "challenge_received",
      title: `${challengerMc} challenged you!`,
      message: `${gamemode.toUpperCase()} match on ${server} at ${scheduled.toLocaleString()}. Video recording is required.`,
      link: "/my-challenges",
      data: { challengeId: challenge._id.toString() },
    });
  }

  res.status(201).json({ ...challenge.toJSON(), id: challenge._id.toString() });
});

router.get("/challenges/recent", async (_req: Request, res: Response): Promise<void> => {
  const challenges = await Challenge.find().sort({ createdAt: -1 }).limit(10);
  res.json({
    challenges: challenges.map((c: any) => ({ ...c.toJSON(), id: c._id.toString() })),
  });
});

router.get("/challenges/mine", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const [incoming, outgoing] = await Promise.all([
    Challenge.find({ opponentUserId: user.userId }).sort({ createdAt: -1 }).limit(50),
    Challenge.find({ challengerId: user.userId }).sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({
    incoming: incoming.map((c: any) => ({ ...c.toJSON(), id: c._id.toString() })),
    outgoing: outgoing.map((c: any) => ({ ...c.toJSON(), id: c._id.toString() })),
  });
});

router.post("/challenges/:id/accept", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const challenge = await Challenge.findById(id);
  if (!challenge) { res.status(404).json({ error: "not_found" }); return; }
  if (challenge.opponentUserId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Only the challenged player can respond." });
    return;
  }
  if (challenge.status !== "pending") {
    res.status(400).json({ error: "already_responded", message: `Challenge already ${challenge.status}.` });
    return;
  }
  challenge.status = "accepted";
  challenge.respondedAt = new Date();
  await challenge.save();

  await Notification.create({
    userId: challenge.challengerId,
    type: "challenge_accepted",
    title: `${challenge.opponentUsername} accepted your challenge`,
    message: `${challenge.gamemode.toUpperCase()} on ${challenge.server} at ${new Date(challenge.scheduledTime).toLocaleString()}.`,
    link: "/my-challenges",
    data: { challengeId: challenge._id.toString() },
  });

  res.json({ success: true });
});

router.post("/challenges/:id/reject", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 300) : null;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const challenge = await Challenge.findById(id);
  if (!challenge) { res.status(404).json({ error: "not_found" }); return; }
  if (challenge.opponentUserId !== user.userId) {
    res.status(403).json({ error: "forbidden", message: "Only the challenged player can respond." });
    return;
  }
  if (challenge.status !== "pending") {
    res.status(400).json({ error: "already_responded", message: `Challenge already ${challenge.status}.` });
    return;
  }
  challenge.status = "rejected";
  challenge.rejectReason = reason;
  challenge.respondedAt = new Date();
  await challenge.save();

  await Notification.create({
    userId: challenge.challengerId,
    type: "challenge_rejected",
    title: `${challenge.opponentUsername} declined your challenge`,
    message: reason ? `Reason: ${reason}` : "No reason provided.",
    link: "/my-challenges",
    data: { challengeId: challenge._id.toString() },
  });

  res.json({ success: true });
});

router.post("/challenges/:id/cancel", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const challenge = await Challenge.findById(id);
  if (!challenge) { res.status(404).json({ error: "not_found" }); return; }
  if (challenge.challengerId !== user.userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (challenge.status !== "pending" && challenge.status !== "accepted") {
    res.status(400).json({ error: "cant_cancel" });
    return;
  }
  challenge.status = "cancelled";
  await challenge.save();
  res.json({ success: true });
});

export default router;
