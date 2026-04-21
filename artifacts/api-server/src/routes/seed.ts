import { Router, type IRouter, type Request, type Response } from "express";
import { User, Player, Match } from "@workspace/db";
import { hashPassword, signToken } from "../lib/auth";

const router: IRouter = Router();

router.post("/setup-admin", async (req: Request, res: Response): Promise<void> => {
  const { email, setupKey } = req.body;

  const expectedKey = process.env.SETUP_SECRET || "sovereign-setup-2024";
  if (setupKey !== expectedKey) {
    res.status(403).json({ error: "forbidden", message: "Invalid setup key" });
    return;
  }

  if (!email) {
    res.status(400).json({ error: "validation_error", message: "Email is required" });
    return;
  }

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { role: "superadmin" },
    { new: true }
  );

  if (!user) {
    res.status(404).json({ error: "not_found", message: `No account found with email: ${email}. Register on the site first, then call this endpoint.` });
    return;
  }

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    role: "superadmin",
  });

  res.json({
    success: true,
    message: `${user.username} (${user.email}) has been promoted to superadmin. Use the token below to log in instantly, or just log out and back in on the website.`,
    token,
    user: { id: user._id.toString(), username: user.username, email: user.email, role: "superadmin" },
  });
});

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

  const adminPasswordHash = await hashPassword("Admin1234!");
  try {
    await User.findOneAndUpdate(
      { email: "admin@pvp.gg" },
      {
        email: "admin@pvp.gg",
        username: "Admin",
        passwordHash: adminPasswordHash,
        role: "superadmin",
        isBanned: false,
      },
      { upsert: true }
    );
  } catch {}

  const existingPlayer = await Player.findOne();
  if (existingPlayer && !force) {
    res.status(400).json({
      error: "already_seeded",
      message: "Database already has players. Pass force=true to re-seed.",
      adminCreated: true,
    });
    return;
  }

  if (force) {
    await Promise.all([Player.deleteMany({}), Match.deleteMany({})]);
  }

  const passwordHash = await hashPassword("Test1234!");

  // Upsert all users in parallel
  const users = await Promise.all(
    FAKE_PLAYERS.map(p =>
      User.findOneAndUpdate(
        { email: `${p.ign.toLowerCase().replace(/[^a-z0-9]/g, "")}@pvptiers.gg` },
        {
          email: `${p.ign.toLowerCase().replace(/[^a-z0-9]/g, "")}@pvptiers.gg`,
          username: p.ign,
          passwordHash,
          role: "user",
          minecraftUsername: p.ign,
          isBanned: false,
        },
        { upsert: true, new: true }
      )
    )
  );

  // Build all player docs and insert in one batch
  const playerDocs = FAKE_PLAYERS.map((p, i) => ({
    userId: users[i]!._id.toString(),
    minecraftUsername: p.ign,
    tier: p.tier as typeof TIERS[number],
    elo: p.elo,
    wins: p.wins,
    losses: p.losses,
    winStreak: Math.floor(Math.random() * 10),
    region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
    discordUsername: `${p.ign}#${Math.floor(1000 + Math.random() * 9000)}`,
    gamemodeStats: GAMEMODES.map(gm => {
      const offset = Math.floor(Math.random() * 3) - 1;
      const base = TIERS.indexOf(p.tier as typeof TIERS[number]);
      const idx = Math.max(0, Math.min(TIERS.length - 1, base + offset));
      return {
        gamemode: gm,
        wins: Math.floor(p.wins * Math.random() * 0.4),
        losses: Math.floor(p.losses * Math.random() * 0.4),
        elo: 800 + Math.floor(Math.random() * 600),
        tier: TIERS[idx],
      };
    }),
  }));

  const allPlayers = await Player.insertMany(playerDocs, { ordered: false }).catch(() => Player.find().limit(20));

  // Build all match docs and insert in one batch
  if (Array.isArray(allPlayers) && allPlayers.length >= 2) {
    const matchDocs = Array.from({ length: Math.min(30, allPlayers.length - 1) }, () => {
      const winnerIdx = Math.floor(Math.random() * allPlayers.length);
      let loserIdx = Math.floor(Math.random() * allPlayers.length);
      while (loserIdx === winnerIdx) loserIdx = Math.floor(Math.random() * allPlayers.length);
      const winner = allPlayers[winnerIdx];
      const loser = allPlayers[loserIdx];
      return {
        winnerId: winner._id.toString(),
        loserId: loser._id.toString(),
        winnerUsername: winner.minecraftUsername,
        loserUsername: loser.minecraftUsername,
        gamemode: GAMEMODES[Math.floor(Math.random() * GAMEMODES.length)],
        eloChange: 15 + Math.floor(Math.random() * 20),
        playedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
      };
    });
    await Match.insertMany(matchDocs, { ordered: false }).catch(() => null);
  }

  res.json({
    success: true,
    message: `Seeded ${FAKE_PLAYERS.length} players and match history`,
  });
});

export default router;
