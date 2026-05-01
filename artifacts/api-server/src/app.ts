import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { User, SiteSetting, connectDB } from "@workspace/db";
import { hashPassword } from "./lib/auth.js";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options(/.*/, cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: "internal_error", message });
});

const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "PVPTIERS",
  site_description: "The most prestigious Minecraft PvP ranking platform.",
  server_ip: "play.pvp-leaderboard.net",
  discord_url: "https://discord.gg/pvptiers",
  homepage_hero_title: "DOMINATE THE\nCOMPETITION",
  homepage_hero_subtitle: "The most prestigious Minecraft PvP ranking platform. Battle top players, climb the tiers, and prove your worth in the ultimate arena.",
  homepage_season_badge: "Season 4 is currently active",
  leaderboard_title: "Global Rankings",
  leaderboard_description: "Top players ranked by ELO across all gamemodes.",
  primary_color: "#00D4FF",
  accent_color: "#00FF87",
  social_twitter: "",
  social_youtube: "",
  social_twitch: "",
};

async function ensureAdminAccount() {
  try {
    const existing = await User.findOne({ email: "admin@pvp.gg" });
    if (!existing) {
      const passwordHash = await hashPassword("Admin1234!");
      await User.create({
        email: "admin@pvp.gg",
        username: "Admin",
        passwordHash,
        role: "superadmin",
        isBanned: false,
      });
      logger.info("Default admin account created (admin@pvp.gg)");
    }
  } catch (err) {
    logger.warn({ err }, "Could not ensure admin account (will retry on next start)");
  }
}

async function ensureDefaultSettings() {
  try {
    const existing = await SiteSetting.find();
    const existingKeys = new Set(existing.map((s: any) => s.key));
    const missing = Object.entries(DEFAULT_SETTINGS).filter(([key]) => !existingKeys.has(key));
    if (missing.length > 0) {
      await SiteSetting.insertMany(
        missing.map(([key, value]) => ({ key, value }))
      );
      logger.info({ count: missing.length }, "Default site settings seeded");
    }
  } catch (err) {
    logger.warn({ err }, "Could not seed default site settings");
  }
}

ensureAdminAccount();
ensureDefaultSettings();

export default app;
