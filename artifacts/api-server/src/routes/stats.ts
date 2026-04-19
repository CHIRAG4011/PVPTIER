import { Router, type IRouter, type Request, type Response } from "express";
import { desc } from "drizzle-orm";
import { db, playersTable, matchesTable, seasonsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/global", async (_req: Request, res: Response): Promise<void> => {
  const [players, matches, activeSeason] = await Promise.all([
    db.select().from(playersTable).orderBy(desc(playersTable.elo)),
    db.select().from(matchesTable),
    db.select().from(seasonsTable).orderBy(desc(seasonsTable.createdAt)).limit(1),
  ]);

  const topPlayer = players[0];
  res.json({
    totalPlayers: players.length,
    totalMatches: matches.length,
    activeSeason: activeSeason[0]?.name ?? "Season 1",
    topPlayer: topPlayer?.minecraftUsername ?? "None",
    topPlayerElo: topPlayer?.elo ?? 0,
  });
});

router.get("/stats/activity", async (_req: Request, res: Response): Promise<void> => {
  const [recentMatches, recentPlayers] = await Promise.all([
    db.select().from(matchesTable).orderBy(desc(matchesTable.playedAt)).limit(10),
    db.select().from(playersTable).orderBy(desc(playersTable.createdAt)).limit(5),
  ]);

  res.json({
    recentMatches,
    recentPlayers: recentPlayers.map(p => ({
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
    })),
  });
});

router.get("/stats/tier-distribution", async (_req: Request, res: Response): Promise<void> => {
  const players = await db.select().from(playersTable);
  const total = players.length || 1;

  const tierCounts: Record<string, number> = {};
  players.forEach(p => {
    tierCounts[p.tier] = (tierCounts[p.tier] ?? 0) + 1;
  });

  const tiers = ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"];
  const distribution = tiers.map(tier => ({
    tier,
    count: tierCounts[tier] ?? 0,
    percentage: Math.round(((tierCounts[tier] ?? 0) / total) * 10000) / 100,
  }));

  res.json({ distribution });
});

export default router;
