import { Router, type IRouter, type Request, type Response } from "express";
import { eq, ilike, desc, and } from "drizzle-orm";
import { db, playersTable, gamemodeStatsTable, matchesTable } from "@workspace/db";
import { ListPlayersQueryParams, GetPlayerParams, GetPlayerStatsParams, GetPlayerMatchesParams, GetPlayerMatchesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function calcKd(wins: number, losses: number): number {
  if (losses === 0) return wins;
  return Math.round((wins / losses) * 100) / 100;
}

function calcWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 10000) / 100;
}

function formatPlayer(p: typeof playersTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    minecraftUsername: p.minecraftUsername,
    minecraftUuid: p.minecraftUuid,
    tier: p.tier,
    elo: p.elo,
    wins: p.wins,
    losses: p.losses,
    winStreak: p.winStreak,
    discordUsername: p.discordUsername,
    region: p.region,
    badges: p.badges ?? [],
    createdAt: p.createdAt,
  };
}

router.get("/players", async (req: Request, res: Response): Promise<void> => {
  const parsed = ListPlayersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { gamemode: _gamemode, tier, search, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  let query = db.select().from(playersTable).orderBy(desc(playersTable.elo));

  if (tier) {
    const filtered = await db.select().from(playersTable).where(and(
      eq(playersTable.tier, tier as "LT1"),
      search ? ilike(playersTable.minecraftUsername, `%${search}%`) : undefined
    )).orderBy(desc(playersTable.elo)).limit(limit).offset(offset);

    const total = filtered.length;
    res.json({
      players: filtered.map(formatPlayer),
      total: total + offset,
      page,
      totalPages: Math.ceil((total + offset) / limit),
    });
    return;
  }

  if (search) {
    const filtered = await db.select().from(playersTable)
      .where(ilike(playersTable.minecraftUsername, `%${search}%`))
      .orderBy(desc(playersTable.elo)).limit(limit).offset(offset);

    res.json({
      players: filtered.map(formatPlayer),
      total: filtered.length + offset,
      page,
      totalPages: Math.ceil((filtered.length + offset) / limit),
    });
    return;
  }

  const players = await query.limit(limit).offset(offset);
  const allPlayers = await db.select().from(playersTable);

  res.json({
    players: players.map(formatPlayer),
    total: allPlayers.length,
    page,
    totalPages: Math.ceil(allPlayers.length / limit),
  });
});

router.get("/players/:id", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
  if (!player) {
    res.status(404).json({ error: "not_found", message: "Player not found" });
    return;
  }

  const gamemodeStats = await db.select().from(gamemodeStatsTable).where(eq(gamemodeStatsTable.playerId, id));
  const recentMatches = await db.select().from(matchesTable)
    .where(eq(matchesTable.winnerId, id))
    .orderBy(desc(matchesTable.playedAt))
    .limit(10);

  res.json({
    ...formatPlayer(player),
    gamemodeStats: gamemodeStats.map(gs => ({
      gamemode: gs.gamemode,
      wins: gs.wins,
      losses: gs.losses,
      elo: gs.elo,
      kd: calcKd(gs.wins, gs.losses),
      winRate: calcWinRate(gs.wins, gs.losses),
    })),
    recentMatches,
  });
});

router.get("/players/:id/stats", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const gamemodeStats = await db.select().from(gamemodeStatsTable).where(eq(gamemodeStatsTable.playerId, id));
  res.json({
    gamemodeStats: gamemodeStats.map(gs => ({
      gamemode: gs.gamemode,
      wins: gs.wins,
      losses: gs.losses,
      elo: gs.elo,
      kd: calcKd(gs.wins, gs.losses),
      winRate: calcWinRate(gs.wins, gs.losses),
    })),
  });
});

router.get("/players/:id/matches", async (req: Request, res: Response): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const qParsed = GetPlayerMatchesQueryParams.safeParse(req.query);
  const page = qParsed.success ? (qParsed.data.page ?? 1) : 1;
  const limit = qParsed.success ? (qParsed.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  const matches = await db.select().from(matchesTable)
    .where(eq(matchesTable.winnerId, id))
    .orderBy(desc(matchesTable.playedAt))
    .limit(limit)
    .offset(offset);

  res.json({
    matches,
    total: matches.length + offset,
    page,
    totalPages: Math.ceil((matches.length + offset) / limit),
  });
});

export default router;
