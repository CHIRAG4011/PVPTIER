import { Router, type IRouter, type Request, type Response } from "express";
import { SiteSetting } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "PVPTIERS",
  site_logo: "",
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

router.get("/settings/public", async (_req: Request, res: Response): Promise<void> => {
  const rows = await SiteSetting.find();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  rows.forEach((r: any) => { settings[r.key] = r.value; });
  res.json(settings);
});

router.get("/admin/settings", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await SiteSetting.find();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  rows.forEach((r: any) => { settings[r.key] = r.value; });
  res.json(settings);
});

router.patch("/admin/settings", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const updates = req.body as Record<string, string>;

  const ops = Object.entries(updates)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) =>
      SiteSetting.findOneAndUpdate(
        { key },
        { key, value, updatedBy: adminUser.userId },
        { upsert: true, new: true }
      )
    );

  await Promise.all(ops);
  res.json({ success: true, message: "Settings updated" });
});

export default router;
