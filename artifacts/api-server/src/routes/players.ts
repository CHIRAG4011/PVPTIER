import { Router, type IRouter, type Request, type Response } from "express";
import { Player, User } from "@workspace/db";
import { ListPlayersQueryParams } from "@workspace/api-zod";
import mongoose from "mongoose";

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

function formatPlayer(p: any, u?: any) {
  return {
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
    customSkinUrl: u?.customSkinUrl ?? null,
    avatarUrl: u?.avatarUrl ?? null,
  };
}

async function attachUsers(players: any[]): Promise<Map<string, any>> {
  const ids = players.map(p => p.userId).filter(Boolean);
  const names = players.map(p => p.minecraftUsername).filter(Boolean);
  const orClauses: any[] = [];
  if (ids.length) orClauses.push({ _id: { $in: ids } });
  if (names.length) {
    const escaped = names.map(n => String(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    orClauses.push({ minecraftUsername: { $in: escaped.map(n => new RegExp(`^${n}$`, "i")) } });
  }
  const map = new Map<string, any>();
  if (!orClauses.length) return map;
  const users = await User.find({ $or: orClauses }).select("_id minecraftUsername customSkinUrl avatarUrl");
  for (const u of users) {
    map.set(u._id.toString(), u);
    if (u.minecraftUsername) map.set(`name:${u.minecraftUsername.toLowerCase()}`, u);
  }
  return map;
}

function userForPlayer(p: any, userMap: Map<string, any>): any | undefined {
  if (p.userId && userMap.has(p.userId)) return userMap.get(p.userId);
  if (p.minecraftUsername) return userMap.get(`name:${p.minecraftUsername.toLowerCase()}`);
  return undefined;
}

router.get("/players/search", async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q ? String(req.query.q) : "";
  if (!q || q.length < 2) {
    res.json({ players: [] });
    return;
  }

  const { Player } = await import("@workspace/db");
  const players = await Player.find({ minecraftUsername: { $regex: q, $options: "i" } }).limit(10);
  const userMap = await attachUsers(players);
  res.json({ players: players.map(p => formatPlayer(p, userForPlayer(p, userMap))) });
});

router.get("/players", async (req: Request, res: Response): Promise<void> => {
  const parsed = ListPlayersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { tier, search, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const filter: any = {};
  if (tier) filter.tier = tier;
  if (search) filter.minecraftUsername = { $regex: search, $options: "i" };

  const [players, total] = await Promise.all([
    Player.find(filter).sort({ elo: -1 }).skip(offset).limit(limit),
    Player.countDocuments(filter),
  ]);

  const userMap = await attachUsers(players);
  res.json({
    players: players.map(p => formatPlayer(p, userForPlayer(p, userMap))),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/players/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  // Accept either a Player _id OR a User _id (userId on Player) so that
  // navigation links built from the auth user still resolve correctly.
  let player = await Player.findById(id);
  if (!player) {
    player = await Player.findOne({ userId: id });
  }

  // If still no Player but the id refers to a real User, auto-create a Player
  // record so older accounts (registered before auto-create existed) work too.
  if (!player) {
    const userDoc = await User.findById(id);
    if (userDoc) {
      const playerName = (userDoc.minecraftUsername || userDoc.username || "").trim();
      if (playerName) {
        const existingByName = await Player.findOne({ minecraftUsername: playerName });
        if (existingByName) {
          if (!existingByName.userId) {
            existingByName.userId = userDoc._id.toString();
            await existingByName.save();
          }
          player = existingByName;
        } else {
          player = await Player.create({
            userId: userDoc._id.toString(),
            minecraftUsername: playerName,
            tier: "LT1",
            elo: 0,
            wins: 0,
            losses: 0,
            winStreak: 0,
            region: "NA",
            badges: [],
            gamemodeStats: [],
          });
        }
      }
    }
  }

  if (!player) {
    res.status(404).json({ error: "not_found", message: "Player not found" });
    return;
  }

  const playerIdStr = player._id.toString();
  const { Match } = await import("@workspace/db");
  const recentMatches = await Match.find({ winnerId: playerIdStr }).sort({ playedAt: -1 }).limit(10);

  const detailUserMap = await attachUsers([player]);
  res.json({
    ...formatPlayer(player, userForPlayer(player, detailUserMap)),
    gamemodeStats: (player.gamemodeStats ?? []).map((gs: any) => ({
      gamemode: gs.gamemode,
      wins: gs.wins,
      losses: gs.losses,
      elo: gs.elo,
      kd: calcKd(gs.wins, gs.losses),
      winRate: calcWinRate(gs.wins, gs.losses),
    })),
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
  });
});

router.get("/players/:id/stats", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  let player = await Player.findById(id);
  if (!player) player = await Player.findOne({ userId: id });
  if (!player) {
    res.status(404).json({ error: "not_found", message: "Player not found" });
    return;
  }

  res.json({
    gamemodeStats: (player.gamemodeStats ?? []).map((gs: any) => ({
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
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid player ID" });
    return;
  }

  const page = parseInt(String(req.query.page ?? 1), 10);
  const limit = parseInt(String(req.query.limit ?? 20), 10);
  const offset = (page - 1) * limit;

  let player = await Player.findById(id);
  if (!player) player = await Player.findOne({ userId: id });
  const playerIdStr = player?._id.toString() ?? id;

  const { Match } = await import("@workspace/db");
  const [matches, total] = await Promise.all([
    Match.find({ $or: [{ winnerId: playerIdStr }, { loserId: playerIdStr }] }).sort({ playedAt: -1 }).skip(offset).limit(limit),
    Match.countDocuments({ $or: [{ winnerId: playerIdStr }, { loserId: playerIdStr }] }),
  ]);

  res.json({
    matches: matches.map((m: any) => ({
      id: m._id.toString(),
      winnerId: m.winnerId,
      loserId: m.loserId,
      winnerUsername: m.winnerUsername,
      loserUsername: m.loserUsername,
      gamemode: m.gamemode,
      eloChange: m.eloChange,
      playedAt: m.playedAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
