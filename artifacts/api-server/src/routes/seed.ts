import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, playersTable, matchesTable, gamemodeStatsTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

const GAMEMODES = ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"] as const;
const TIERS = ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"] as const;
const REGIONS = ["NA", "EU", "AS", "SA", "OC"];

const FAKE_PLAYERS = [
  { ign: "xXProSlayerXx", tier: "HT1", elo: 2850, wins: 342, losses: 89 },
  { ign: "CrystalKnight", tier: "HT2", elo: 2650, wins: 287, losses: 103 },
  { ign: "NightFalcon", tier: "HT3", elo: 2420, wins: 231, losses: 115 },
  { ign: "VoidWalker", tier: "HT4", elo: 2210, wins: 198, losses: 122 },
  { ign: "ShadowStrike", tier: "HT5", elo: 2050, wins: 176, losses: 131 },
  { ign: "BladeRunner99", tier: "LT5", elo: 1880, wins: 154, losses: 142 },
  { ign: "IceQueen2k", tier: "LT4", elo: 1720, wins: 132, losses: 148 },
  { ign: "ThunderBolt_", tier: "LT3", elo: 1560, wins: 115, losses: 158 },
  { ign: "PhoenixRise", tier: "LT2", elo: 1390, wins: 98, losses: 167 },
  { ign: "SteelGhost", tier: "LT1", elo: 1210, wins: 67, losses: 189 },
  { ign: "CobraFang", tier: "HT1", elo: 2790, wins: 315, losses: 94 },
  { ign: "ArcaneWizard", tier: "HT2", elo: 2580, wins: 267, losses: 109 },
  { ign: "RubySlasher", tier: "HT3", elo: 2340, wins: 218, losses: 118 },
  { ign: "DragonClaw", tier: "HT4", elo: 2150, wins: 187, losses: 127 },
  { ign: "StarFighter_", tier: "LT5", elo: 1950, wins: 164, losses: 138 },
  { ign: "MoonBlade", tier: "LT4", elo: 1790, wins: 143, losses: 145 },
  { ign: "EmberStorm", tier: "LT3", elo: 1630, wins: 122, losses: 153 },
  { ign: "IronShield7", tier: "LT2", elo: 1470, wins: 104, losses: 162 },
  { ign: "SilentKiller", tier: "LT1", elo: 1290, wins: 77, losses: 178 },
  { ign: "ToxicArrow", tier: "LT1", elo: 1080, wins: 45, losses: 201 },
];

router.post("/admin/seed", async (req: Request, res: Response): Promise<void> => {
  const { force } = req.body;

  // Always ensure a superadmin account exists regardless of seed state
  const adminPasswordHash = await hashPassword("Admin1234!");
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, "admin@pvp.gg")).limit(1);
    if (existing.length === 0) {
      await db.insert(usersTable).values({
        email: "admin@pvp.gg",
        username: "Admin",
        passwordHash: adminPasswordHash,
        role: "superadmin",
        isBanned: false,
      });
    } else {
      await db.update(usersTable).set({ role: "superadmin", passwordHash: adminPasswordHash }).where(eq(usersTable.email, "admin@pvp.gg"));
    }
  } catch {}

  const existingPlayers = await db.select().from(playersTable).limit(1);
  if (existingPlayers.length > 0 && !force) {
    res.status(400).json({ error: "already_seeded", message: "Database already has players. Pass force=true to re-seed.", adminCreated: true });
    return;
  }

  const passwordHash = await hashPassword("Test1234!");
  const createdUsers: number[] = [];

  for (let i = 0; i < FAKE_PLAYERS.length; i++) {
    const p = FAKE_PLAYERS[i];
    const existing = await db.select().from(usersTable).limit(1);
    
    try {
      const [user] = await db.insert(usersTable).values({
        email: `${p.ign.toLowerCase().replace(/[^a-z0-9]/g, "")}@pvptiers.gg`,
        username: p.ign,
        passwordHash,
        role: "user",
        minecraftUsername: p.ign,
        isBanned: false,
      }).returning();
      createdUsers.push(user.id);

      const [player] = await db.insert(playersTable).values({
        userId: user.id,
        minecraftUsername: p.ign,
        tier: p.tier as typeof TIERS[number],
        elo: p.elo,
        wins: p.wins,
        losses: p.losses,
        winStreak: Math.floor(Math.random() * 10),
        region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
        discordUsername: `${p.ign}#${Math.floor(1000 + Math.random() * 9000)}`,
      }).returning();

      for (const gm of GAMEMODES) {
        await db.insert(gamemodeStatsTable).values({
          playerId: player.id,
          gamemode: gm,
          wins: Math.floor(p.wins * Math.random() * 0.4),
          losses: Math.floor(p.losses * Math.random() * 0.4),
          elo: 800 + Math.floor(Math.random() * 600),
        });
      }
    } catch {
    }
  }

  const allPlayers = await db.select().from(playersTable).limit(10);
  if (allPlayers.length >= 2) {
    for (let i = 0; i < Math.min(30, allPlayers.length - 1); i++) {
      const winnerIdx = Math.floor(Math.random() * allPlayers.length);
      let loserIdx = Math.floor(Math.random() * allPlayers.length);
      while (loserIdx === winnerIdx) loserIdx = Math.floor(Math.random() * allPlayers.length);
      
      const winner = allPlayers[winnerIdx];
      const loser = allPlayers[loserIdx];
      const gm = GAMEMODES[Math.floor(Math.random() * GAMEMODES.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const playedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      try {
        await db.insert(matchesTable).values({
          winnerId: winner.id,
          loserId: loser.id,
          winnerUsername: winner.minecraftUsername,
          loserUsername: loser.minecraftUsername,
          gamemode: gm,
          eloChange: 15 + Math.floor(Math.random() * 20),
          playedAt,
        });
      } catch {}
    }
  }

  res.json({
    success: true,
    message: `Seeded ${FAKE_PLAYERS.length} players and match history`,
  });
});

export default router;
