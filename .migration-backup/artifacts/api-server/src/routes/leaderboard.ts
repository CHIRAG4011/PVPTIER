import { Router, type IRouter, type Request, type Response } from "express";
import { Player, Match } from "@workspace/db";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatPlayer(p: any, rank?: number) {
  const id = p._id.toString();
  return {
    id,
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
    gamemodeStats: (p.gamemodeStats ?? []).map((s: any) => ({
      gamemode: s.gamemode,
      tier: s.tier ?? null,
      elo: s.elo ?? 0,
      wins: s.wins ?? 0,
      losses: s.losses ?? 0,
    })),
    createdAt: p.createdAt,
    ...(rank !== undefined ? { rank } : {}),
  };
}

router.get("/leaderboard", async (req: Request, res: Response): Promise<void> => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = (page - 1) * limit;

  const total = await Player.countDocuments();
  const players = await Player.find().sort({ elo: -1 }).skip(offset).limit(limit);

  const entries = players.map((p, i) => ({
    rank: offset + i + 1,
    player: formatPlayer(p),
    elo: p.elo,
    wins: p.wins,
    losses: p.losses,
    winStreak: p.winStreak,
    tier: p.tier,
  }));

  res.json({ entries, total, page, totalPages: Math.ceil(total / limit) });
});

router.get("/leaderboard/summary", async (_req: Request, res: Response): Promise<void> => {
  const [totalPlayers, totalMatches] = await Promise.all([
    Player.countDocuments(),
    Match.countDocuments(),
  ]);
  const topPlayer = await Player.findOne().sort({ elo: -1 });
  const activePlayers = await Player.countDocuments({ $or: [{ wins: { $gt: 0 } }, { losses: { $gt: 0 } }] });

  res.json({
    totalPlayers,
    activePlayers,
    totalMatches,
    topTier: topPlayer?.tier ?? "LT1",
    highestElo: topPlayer?.elo ?? 0,
    mostActiveGamemode: "sword",
  });
});

router.get("/leaderboard/top", async (_req: Request, res: Response): Promise<void> => {
  const allPlayers = await Player.find().sort({ elo: -1 }).limit(10);

  res.json({
    byGamemode: {
      sword: allPlayers[0] ? formatPlayer(allPlayers[0]) : null,
      axe: allPlayers[1] ? formatPlayer(allPlayers[1]) : null,
      uhc: allPlayers[2] ? formatPlayer(allPlayers[2]) : null,
      vanilla: allPlayers[3] ? formatPlayer(allPlayers[3]) : null,
    },
    overall: allPlayers.slice(0, 5).map(p => formatPlayer(p)),
  });
});

export default router;
