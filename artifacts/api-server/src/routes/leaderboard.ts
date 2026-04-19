import { Router, type IRouter, type Request, type Response } from "express";
import { desc } from "drizzle-orm";
import { db, playersTable, matchesTable } from "@workspace/db";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leaderboard", async (req: Request, res: Response): Promise<void> => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = (page - 1) * limit;

  const allPlayers = await db.select().from(playersTable).orderBy(desc(playersTable.elo));
  const players = allPlayers.slice(offset, offset + limit);

  const entries = players.map((p, i) => ({
    rank: offset + i + 1,
    player: {
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
    },
    elo: p.elo,
    wins: p.wins,
    losses: p.losses,
    winStreak: p.winStreak,
    tier: p.tier,
  }));

  res.json({
    entries,
    total: allPlayers.length,
    page,
    totalPages: Math.ceil(allPlayers.length / limit),
  });
});

router.get("/leaderboard/summary", async (_req: Request, res: Response): Promise<void> => {
  const players = await db.select().from(playersTable).orderBy(desc(playersTable.elo));
  const matches = await db.select().from(matchesTable);

  const topPlayer = players[0];
  res.json({
    totalPlayers: players.length,
    activePlayers: players.filter(p => p.wins > 0 || p.losses > 0).length,
    totalMatches: matches.length,
    topTier: topPlayer?.tier ?? "LT1",
    highestElo: topPlayer?.elo ?? 0,
    mostActiveGamemode: "sword",
  });
});

router.get("/leaderboard/top", async (_req: Request, res: Response): Promise<void> => {
  const allPlayers = await db.select().from(playersTable).orderBy(desc(playersTable.elo));

  const formatPlayer = (p: typeof playersTable.$inferSelect) => ({
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
  });

  res.json({
    byGamemode: {
      sword: formatPlayer(allPlayers[0] ?? allPlayers[0]),
      axe: formatPlayer(allPlayers[1] ?? allPlayers[0]),
      uhc: formatPlayer(allPlayers[2] ?? allPlayers[0]),
      vanilla: formatPlayer(allPlayers[3] ?? allPlayers[0]),
    },
    overall: allPlayers.slice(0, 5).map(formatPlayer),
  });
});

export default router;
