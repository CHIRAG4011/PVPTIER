import { Router, type IRouter, type Request, type Response } from "express";
import { Player, Match, Season } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/global", async (_req: Request, res: Response): Promise<void> => {
  const [totalPlayers, totalMatches, latestSeason, topPlayer] = await Promise.all([
    Player.countDocuments(),
    Match.countDocuments(),
    Season.findOne().sort({ createdAt: -1 }),
    Player.findOne().sort({ elo: -1 }),
  ]);

  res.json({
    totalPlayers,
    totalMatches,
    activeSeason: latestSeason?.name ?? "Season 1",
    topPlayer: topPlayer?.minecraftUsername ?? "None",
    topPlayerElo: topPlayer?.elo ?? 0,
  });
});

router.get("/stats/activity", async (_req: Request, res: Response): Promise<void> => {
  const [recentMatches, recentPlayers] = await Promise.all([
    Match.find().sort({ playedAt: -1 }).limit(10),
    Player.find().sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    recentMatches: recentMatches.map((m: any) => ({
      id: m._id.toString(),
      winnerId: m.winnerId,
      loserId: m.loserId,
      winnerUsername: m.winnerUsername,
      loserUsername: m.loserUsername,
      gamemode: m.gamemode,
      eloChange: m.eloChange,
      playedAt: m.playedAt,
    })),
    recentPlayers: recentPlayers.map((p: any) => ({
      id: p._id.toString(),
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
  const total = await Player.countDocuments() || 1;

  const tierCounts = await Player.aggregate([
    { $group: { _id: "$tier", count: { $sum: 1 } } },
  ]);

  const countMap: Record<string, number> = {};
  tierCounts.forEach((t: any) => { countMap[t._id] = t.count; });

  const tiers = ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"];
  const distribution = tiers.map(tier => ({
    tier,
    count: countMap[tier] ?? 0,
    percentage: Math.round(((countMap[tier] ?? 0) / total) * 10000) / 100,
  }));

  res.json({ distribution });
});

export default router;
