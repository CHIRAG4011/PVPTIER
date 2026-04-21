import { Router, type IRouter, type Request, type Response } from "express";
import { User, Player, Match, Ticket, Submission, AdminLog, Season, UserCustomRole, CustomRole } from "@workspace/db";
import { AdminListUsersQueryParams, BanUserBody, UpdateUserRoleBody, AdminUpdatePlayerStatsBody, GetAdminLogsQueryParams, CreateSeasonBody } from "@workspace/api-zod";
import * as z from "zod";
import { requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import mongoose from "mongoose";

const router: IRouter = Router();

function formatUser(u: any, customRole?: any) {
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
    customRole: customRole ? {
      id: customRole._id.toString(),
      name: customRole.name,
      color: customRole.color,
      icon: customRole.icon,
      permissions: customRole.permissions,
    } : null,
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

  const userIds = users.map((u: any) => u._id.toString());
  const customRoleAssignments = await UserCustomRole.find({ userId: { $in: userIds } });
  const customRoleIds = customRoleAssignments.map((a: any) => a.customRoleId);
  const customRoles = await CustomRole.find({ _id: { $in: customRoleIds } });

  const roleMap = new Map(customRoles.map((r: any) => [r._id.toString(), r]));
  const assignmentMap = new Map(customRoleAssignments.map((a: any) => [a.userId, a.customRoleId]));

  res.json({
    users: users.map((u: any) => {
      const roleId = assignmentMap.get(u._id.toString());
      const customRole = roleId ? roleMap.get(roleId) : null;
      return formatUser(u, customRole);
    }),
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

const TierEnum = z.enum(["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"]);
const GamemodeTier = z.union([TierEnum, z.literal("none"), z.null()]).optional();

const CreatePlayerBody = z.object({
  minecraftUsername: z.string().min(1).max(16),
  minecraftUuid: z.string().optional(),
  discordUsername: z.string().optional(),
  tier: TierEnum.default("LT1"),
  elo: z.number().int().default(1000),
  wins: z.number().int().min(0).default(0),
  losses: z.number().int().min(0).default(0),
  region: z.string().default("NA"),
  gamemodeTiers: z.record(z.string(), GamemodeTier).optional(),
});

const SUPPORTED_GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];

function buildGamemodeStats(gamemodeTiers?: Record<string, string | null | undefined>) {
  if (!gamemodeTiers) return [];
  const stats: any[] = [];
  for (const gm of SUPPORTED_GAMEMODES) {
    const t = gamemodeTiers[gm];
    if (t && t !== "none") {
      stats.push({ gamemode: gm, wins: 0, losses: 0, elo: 1000, tier: t });
    }
  }
  return stats;
}

router.post("/admin/players/sync-users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;

  const users = await User.find({});
  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const u of users) {
    const playerName = ((u as any).minecraftUsername ?? u.username ?? "").trim();
    if (!playerName) { skipped++; continue; }

    const byUserId = await Player.findOne({ userId: u._id.toString() });
    if (byUserId) { skipped++; continue; }

    const byName = await Player.findOne({ minecraftUsername: { $regex: `^${playerName}$`, $options: "i" } });
    if (byName) {
      if (!byName.userId) {
        byName.userId = u._id.toString();
        await byName.save();
        linked++;
      } else {
        skipped++;
      }
      continue;
    }

    await Player.create({
      userId: u._id.toString(),
      minecraftUsername: playerName,
      tier: "LT1",
      elo: 1000,
      wins: 0,
      losses: 0,
      winStreak: 0,
      region: "NA",
      badges: [],
      gamemodeStats: [],
    });
    created++;
  }

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "sync_players",
    target: "players",
    details: `Synced users → players. created=${created}, linked=${linked}, skipped=${skipped}, total=${users.length}`,
  });

  res.json({ success: true, created, linked, skipped, total: users.length });
});

router.post("/admin/players", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;

  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const existing = await Player.findOne({ minecraftUsername: { $regex: `^${parsed.data.minecraftUsername}$`, $options: "i" } });
  if (existing) {
    res.status(409).json({ error: "conflict", message: "A player with that IGN already exists" });
    return;
  }

  const player = await Player.create({
    minecraftUsername: parsed.data.minecraftUsername,
    minecraftUuid: parsed.data.minecraftUuid ?? null,
    discordUsername: parsed.data.discordUsername ?? null,
    tier: parsed.data.tier,
    elo: parsed.data.elo,
    wins: parsed.data.wins,
    losses: parsed.data.losses,
    region: parsed.data.region,
    gamemodeStats: buildGamemodeStats(parsed.data.gamemodeTiers as any),
  });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "create_player",
    target: `player:${player._id}`,
    details: `Created player: ${player.minecraftUsername}`,
  });

  res.status(201).json({ success: true, player: { id: player._id.toString(), minecraftUsername: player.minecraftUsername } });
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

  const rawTiers = (req.body as any)?.gamemodeTiers as Record<string, string | null | undefined> | undefined;
  const rawScores = (req.body as any)?.gamemodeScores as Record<string, number | string | null | undefined> | undefined;
  const rawWins = (req.body as any)?.gamemodeWins as Record<string, number | string | null | undefined> | undefined;
  const rawLosses = (req.body as any)?.gamemodeLosses as Record<string, number | string | null | undefined> | undefined;
  const anyGmProvided =
    (rawTiers && typeof rawTiers === "object") ||
    (rawScores && typeof rawScores === "object") ||
    (rawWins && typeof rawWins === "object") ||
    (rawLosses && typeof rawLosses === "object");
  if (anyGmProvided) {
    const existing = await Player.findById(id);
    const current: any[] = existing?.gamemodeStats ? JSON.parse(JSON.stringify(existing.gamemodeStats)) : [];
    const map = new Map<string, any>(current.map(s => [s.gamemode, s]));
    const toIntOrUndef = (v: unknown) => {
      const num = typeof v === "number" ? v : v === null || v === undefined || v === "" ? NaN : Number(v);
      return Number.isFinite(num) ? Math.trunc(num) : undefined;
    };
    for (const gm of SUPPORTED_GAMEMODES) {
      const tierProvided = rawTiers && gm in rawTiers;
      const scoreProvided = rawScores && gm in rawScores;
      const winsProvided = rawWins && gm in rawWins;
      const lossesProvided = rawLosses && gm in rawLosses;
      if (!tierProvided && !scoreProvided && !winsProvided && !lossesProvided) continue;

      const t = tierProvided ? rawTiers![gm] : undefined;
      if (tierProvided && (!t || t === "none") && !winsProvided && !lossesProvided && !scoreProvided) {
        map.delete(gm);
        continue;
      }

      const prev = map.get(gm) ?? { gamemode: gm, wins: 0, losses: 0, elo: 1000 };
      const next = { ...prev, gamemode: gm };
      if (tierProvided && t && t !== "none") next.tier = t;
      if (tierProvided && (t === "none" || !t)) next.tier = null;
      if (scoreProvided) {
        const n = toIntOrUndef(rawScores![gm]);
        if (n !== undefined) next.elo = n;
      }
      if (winsProvided) {
        const n = toIntOrUndef(rawWins![gm]);
        if (n !== undefined) next.wins = Math.max(0, n);
      }
      if (lossesProvided) {
        const n = toIntOrUndef(rawLosses![gm]);
        if (n !== undefined) next.losses = Math.max(0, n);
      }
      map.set(gm, next);
    }
    updates.gamemodeStats = Array.from(map.values());
  }

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

router.get("/admin/matches", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page ?? 1), 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search) : undefined;

  const filter: any = {};
  if (search) {
    filter.$or = [
      { winnerUsername: { $regex: search, $options: "i" } },
      { loserUsername: { $regex: search, $options: "i" } },
    ];
  }

  const [matches, total] = await Promise.all([
    Match.find(filter).sort({ playedAt: -1 }).skip(offset).limit(limit),
    Match.countDocuments(filter),
  ]);

  res.json({
    matches: matches.map((m: any) => ({ ...m.toJSON(), id: m._id.toString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

const EditMatchBody = z.object({
  winnerUsername: z.string().min(1).optional(),
  loserUsername: z.string().min(1).optional(),
  gamemode: z.string().min(1).optional(),
  eloChange: z.number().int().min(0).optional(),
  playedAt: z.string().optional(),
});

router.patch("/admin/matches/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid match ID" });
    return;
  }

  const parsed = EditMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const updates: any = {};
  if (parsed.data.winnerUsername) updates.winnerUsername = parsed.data.winnerUsername;
  if (parsed.data.loserUsername) updates.loserUsername = parsed.data.loserUsername;
  if (parsed.data.gamemode) updates.gamemode = parsed.data.gamemode;
  if (parsed.data.eloChange !== undefined) updates.eloChange = parsed.data.eloChange;
  if (parsed.data.playedAt) updates.playedAt = new Date(parsed.data.playedAt);

  const match = await Match.findByIdAndUpdate(id, updates, { new: true });
  if (!match) {
    res.status(404).json({ error: "not_found", message: "Match not found" });
    return;
  }

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "edit_match",
    target: `match:${id}`,
    details: `Edited match: ${JSON.stringify(updates)}`,
  });

  res.json({ success: true, match: { ...match.toJSON(), id: match._id.toString() } });
});

router.delete("/admin/matches/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid match ID" });
    return;
  }

  const match = await Match.findByIdAndDelete(id);
  if (!match) {
    res.status(404).json({ error: "not_found", message: "Match not found" });
    return;
  }

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "delete_match",
    target: `match:${id}`,
    details: `Deleted match between ${match.winnerUsername} and ${match.loserUsername}`,
  });

  res.json({ success: true, message: "Match deleted" });
});

export default router;
