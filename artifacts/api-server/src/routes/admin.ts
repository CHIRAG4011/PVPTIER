import { Router, type IRouter, type Request, type Response } from "express";
import { User, Player, Match, Ticket, Submission, AdminLog, Season } from "@workspace/db";
import { AdminListUsersQueryParams, BanUserBody, UpdateUserRoleBody, AdminUpdatePlayerStatsBody, GetAdminLogsQueryParams, CreateSeasonBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

function formatUser(u: any) {
  return {
    id: u._id.toString(),
    email: u.email,
    username: u.username,
    role: u.role,
    isBanned: u.isBanned,
    minecraftUsername: u.minecraftUsername,
    discordId: u.discordId,
    discordUsername: u.discordUsername,
    discordAvatar: u.discordAvatar,
    createdAt: u.createdAt,
  };
}

router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = parsed.success ? parsed.data.search : undefined;
  const role = parsed.success ? parsed.data.role : undefined;

  const filter: any = {};
  if (search) filter.username = { $regex: search, $options: "i" };
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    users: users.map(formatUser),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/admin/users/:id/ban", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid user ID" });
    return;
  }

  const parsed = BanUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  await User.findByIdAndUpdate(id, { isBanned: true, banReason: parsed.data.reason });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "ban_user",
    target: `user:${id}`,
    details: `Banned user: ${parsed.data.reason}`,
  });

  res.json({ success: true, message: "User banned" });
});

router.post("/admin/users/:id/unban", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid user ID" });
    return;
  }

  await User.findByIdAndUpdate(id, { isBanned: false, banReason: null });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "unban_user",
    target: `user:${id}`,
    details: `Unbanned user #${id}`,
  });

  res.json({ success: true, message: "User unbanned" });
});

router.patch("/admin/users/:id/role", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid user ID" });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  await User.findByIdAndUpdate(id, { role: parsed.data.role });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "update_role",
    target: `user:${id}`,
    details: `Changed role to ${parsed.data.role}`,
  });

  res.json({ success: true, message: "Role updated" });
});

router.patch("/admin/players/:id/stats", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const parsed = AdminUpdatePlayerStatsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const updates: any = {};
  if (parsed.data.elo !== undefined) updates.elo = parsed.data.elo;
  if (parsed.data.wins !== undefined) updates.wins = parsed.data.wins;
  if (parsed.data.losses !== undefined) updates.losses = parsed.data.losses;
  if (parsed.data.tier !== undefined) updates.tier = parsed.data.tier;

  await Player.findByIdAndUpdate(id, updates);

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "update_player_stats",
    target: `player:${id}`,
    details: `Updated stats: ${JSON.stringify(updates)}`,
  });

  res.json({ success: true, message: "Player stats updated" });
});

router.delete("/admin/players/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const player = await Player.findById(id);
  if (!player) {
    res.status(404).json({ error: "not_found", message: "Player not found" });
    return;
  }

  await Player.findByIdAndDelete(id);

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "delete_player",
    target: `player:${id}`,
    details: `Deleted player: ${player.minecraftUsername}`,
  });

  res.json({ success: true, message: "Player deleted" });
});

router.post("/admin/players/:id/reset", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  await Player.findByIdAndUpdate(id, { elo: 1000, wins: 0, losses: 0, winStreak: 0, tier: "LT1" });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "reset_player_stats",
    target: `player:${id}`,
    details: `Reset stats for player #${id}`,
  });

  res.json({ success: true, message: "Player stats reset" });
});

router.get("/admin/analytics", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, totalPlayers, totalMatches, totalTickets,
    openTickets, pendingSubmissions, bannedUsers,
    newUsersThisWeek, matchesThisWeek,
    tierCounts, gamemodeCounts,
  ] = await Promise.all([
    User.countDocuments(),
    Player.countDocuments(),
    Match.countDocuments(),
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: "open" }),
    Submission.countDocuments({ status: "pending" }),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    Match.countDocuments({ playedAt: { $gte: oneWeekAgo } }),
    Player.aggregate([{ $group: { _id: "$tier", count: { $sum: 1 } } }]),
    Match.aggregate([{ $group: { _id: "$gamemode", count: { $sum: 1 } } }]),
  ]);

  const tierMap: Record<string, number> = {};
  tierCounts.forEach((t: any) => { tierMap[t._id] = t.count; });
  const tiers = ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"];
  const tierBreakdown = tiers.map(tier => ({ tier, count: tierMap[tier] ?? 0 }));

  const gmMap: Record<string, number> = {};
  gamemodeCounts.forEach((g: any) => { gmMap[g._id] = g.count; });
  const gamemodes = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];
  const gamemodeBreakdown = gamemodes.map(gamemode => ({ gamemode, matches: gmMap[gamemode] ?? 0 }));

  const activityByDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const dayStart = new Date(dateStr);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const [dayMatches, dayUsers] = await Promise.all([
      Match.countDocuments({ playedAt: { $gte: dayStart, $lt: dayEnd } }),
      User.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } }),
    ]);
    activityByDay.push({ date: dateStr, matches: dayMatches, newUsers: dayUsers });
  }

  res.json({
    totalUsers, totalPlayers, totalMatches, totalTickets,
    openTickets, pendingSubmissions, bannedUsers,
    newUsersThisWeek, matchesThisWeek,
    tierBreakdown, gamemodeBreakdown, activityByDay,
  });
});

router.get("/admin/logs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = GetAdminLogsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const action = parsed.success ? parsed.data.action : undefined;

  const filter: any = {};
  if (action) filter.action = action;

  const [logs, total] = await Promise.all([
    AdminLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    AdminLog.countDocuments(filter),
  ]);

  res.json({
    logs: logs.map((l: any) => ({ ...l.toJSON(), id: l._id.toString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/admin/seasons", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const seasons = await Season.find().sort({ createdAt: -1 });
  res.json({ seasons: seasons.map((s: any) => ({ ...s.toJSON(), id: s._id.toString() })) });
});

router.post("/admin/seasons", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateSeasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const season = await Season.create({
    name: parsed.data.name,
    startDate: new Date(parsed.data.startDate),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    isActive: true,
  });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "create_season",
    target: `season:${season._id}`,
    details: `Created season: ${season.name}`,
  });

  res.status(201).json({ ...season.toJSON(), id: season._id.toString() });
});

router.post("/admin/seasons/:id/reset", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;

  await Player.updateMany({}, { elo: 1000, wins: 0, losses: 0, winStreak: 0, tier: "LT1" });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "reset_season",
    target: `season:${id}`,
    details: `Reset all rankings for season #${id}`,
  });

  res.json({ success: true, message: "Season rankings reset" });
});

export default router;
