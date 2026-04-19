import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db, usersTable, playersTable, matchesTable, ticketsTable, submissionsTable, adminLogsTable, seasonsTable } from "@workspace/db";
import { AdminListUsersQueryParams, BanUserBody, UpdateUserRoleBody, AdminUpdatePlayerStatsBody, GetAdminLogsQueryParams, CreateSeasonBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = parsed.success ? parsed.data.search : undefined;
  const role = parsed.success ? parsed.data.role : undefined;

  const buildWhere = () => {
    const conditions = [];
    if (search) conditions.push(ilike(usersTable.username, `%${search}%`));
    if (role) conditions.push(eq(usersTable.role, role as "user" | "moderator" | "admin" | "superadmin"));
    return conditions.length > 0 ? and(...conditions) : undefined;
  };

  const where = buildWhere();

  const users = where
    ? await db.select().from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset)
    : await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

  const allUsers = where
    ? await db.select().from(usersTable).where(where)
    : await db.select().from(usersTable);

  res.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      isBanned: u.isBanned,
      minecraftUsername: u.minecraftUsername,
      discordId: u.discordId,
      discordUsername: u.discordUsername,
      discordAvatar: u.discordAvatar,
      createdAt: u.createdAt,
    })),
    total: allUsers.length,
    page,
    totalPages: Math.ceil(allUsers.length / limit),
  });
});

router.post("/admin/users/:id/ban", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid user ID" });
    return;
  }

  const parsed = BanUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  await db.update(usersTable).set({ isBanned: true, banReason: parsed.data.reason }).where(eq(usersTable.id, id));

  await db.insert(adminLogsTable).values({
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid user ID" });
    return;
  }

  await db.update(usersTable).set({ isBanned: false, banReason: null }).where(eq(usersTable.id, id));

  await db.insert(adminLogsTable).values({
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid user ID" });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  await db.update(usersTable).set({ role: parsed.data.role }).where(eq(usersTable.id, id));

  await db.insert(adminLogsTable).values({
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const parsed = AdminUpdatePlayerStatsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const updates: Partial<{ elo: number; wins: number; losses: number; tier: "LT1" | "LT2" | "LT3" | "LT4" | "LT5" | "HT1" | "HT2" | "HT3" | "HT4" | "HT5" }> = {};
  if (parsed.data.elo !== undefined) updates.elo = parsed.data.elo;
  if (parsed.data.wins !== undefined) updates.wins = parsed.data.wins;
  if (parsed.data.losses !== undefined) updates.losses = parsed.data.losses;
  if (parsed.data.tier !== undefined) updates.tier = parsed.data.tier;

  await db.update(playersTable).set(updates).where(eq(playersTable.id, id));

  await db.insert(adminLogsTable).values({
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
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const player = await db.select().from(playersTable).where(eq(playersTable.id, id)).limit(1);
  if (!player.length) {
    res.status(404).json({ error: "not_found", message: "Player not found" });
    return;
  }

  await db.delete(playersTable).where(eq(playersTable.id, id));

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "delete_player",
    target: `player:${id}`,
    details: `Deleted player: ${player[0].minecraftUsername}`,
  });

  res.json({ success: true, message: "Player deleted" });
});

router.post("/admin/players/:id/reset", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  await db.update(playersTable).set({ elo: 1000, wins: 0, losses: 0, winStreak: 0, tier: "LT1" }).where(eq(playersTable.id, id));

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "reset_player_stats",
    target: `player:${id}`,
    details: `Reset stats for player #${id}`,
  });

  res.json({ success: true, message: "Player stats reset" });
});

router.get("/admin/analytics", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const [users, players, matches, tickets, openTickets, pendingSubmissions, bannedUsers] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(playersTable),
    db.select().from(matchesTable),
    db.select().from(ticketsTable),
    db.select().from(ticketsTable).where(eq(ticketsTable.status, "open")),
    db.select().from(submissionsTable).where(eq(submissionsTable.status, "pending")),
    db.select().from(usersTable).where(eq(usersTable.isBanned, true)),
  ]);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsersThisWeek = users.filter(u => u.createdAt > oneWeekAgo).length;
  const matchesThisWeek = matches.filter(m => m.playedAt > oneWeekAgo).length;

  const tierCounts: Record<string, number> = {};
  players.forEach(p => {
    tierCounts[p.tier] = (tierCounts[p.tier] ?? 0) + 1;
  });

  const tiers = ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"];
  const tierBreakdown = tiers.map(tier => ({ tier, count: tierCounts[tier] ?? 0 }));

  const gamemodeCounts: Record<string, number> = {};
  matches.forEach(m => {
    gamemodeCounts[m.gamemode] = (gamemodeCounts[m.gamemode] ?? 0) + 1;
  });

  const gamemodes = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"];
  const gamemodeBreakdown = gamemodes.map(gamemode => ({ gamemode, matches: gamemodeCounts[gamemode] ?? 0 }));

  const activityByDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const dayStart = new Date(dateStr);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    activityByDay.push({
      date: dateStr,
      matches: matches.filter(m => m.playedAt >= dayStart && m.playedAt < dayEnd).length,
      newUsers: users.filter(u => u.createdAt >= dayStart && u.createdAt < dayEnd).length,
    });
  }

  res.json({
    totalUsers: users.length,
    totalPlayers: players.length,
    totalMatches: matches.length,
    totalTickets: tickets.length,
    openTickets: openTickets.length,
    pendingSubmissions: pendingSubmissions.length,
    bannedUsers: bannedUsers.length,
    newUsersThisWeek,
    matchesThisWeek,
    tierBreakdown,
    gamemodeBreakdown,
    activityByDay,
  });
});

router.get("/admin/logs", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = GetAdminLogsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const action = parsed.success ? parsed.data.action : undefined;

  const where = action ? eq(adminLogsTable.action, action) : undefined;

  const logs = where
    ? await db.select().from(adminLogsTable).where(where).orderBy(desc(adminLogsTable.createdAt)).limit(limit).offset(offset)
    : await db.select().from(adminLogsTable).orderBy(desc(adminLogsTable.createdAt)).limit(limit).offset(offset);

  const allLogs = where
    ? await db.select().from(adminLogsTable).where(where)
    : await db.select().from(adminLogsTable);

  res.json({
    logs,
    total: allLogs.length,
    page,
    totalPages: Math.ceil(allLogs.length / limit),
  });
});

router.get("/admin/seasons", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const seasons = await db.select().from(seasonsTable).orderBy(desc(seasonsTable.createdAt));
  res.json({ seasons });
});

router.post("/admin/seasons", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const parsed = CreateSeasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [season] = await db.insert(seasonsTable).values({
    name: parsed.data.name,
    startDate: new Date(parsed.data.startDate),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    isActive: true,
  }).returning();

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "create_season",
    target: `season:${season.id}`,
    details: `Created season: ${season.name}`,
  });

  res.status(201).json(season);
});

router.post("/admin/seasons/:id/reset", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid season ID" });
    return;
  }

  await db.update(playersTable).set({ elo: 1000, wins: 0, losses: 0, winStreak: 0, tier: "LT1" });

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "reset_season",
    target: `season:${id}`,
    details: `Reset all rankings for season #${id}`,
  });

  res.json({ success: true, message: "Season rankings reset" });
});

export default router;
