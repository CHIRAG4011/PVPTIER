import { Router, type IRouter, type Request, type Response } from "express";
import { Gamemode } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";

const router: IRouter = Router();

const DEFAULT_GAMEMODES = [
  { slug: "sword", name: "Sword", emoji: "⚔️", order: 0 },
  { slug: "axe", name: "Axe", emoji: "🪓", order: 1 },
  { slug: "uhc", name: "UHC", emoji: "🔥", order: 2 },
  { slug: "vanilla", name: "Vanilla", emoji: "🌿", order: 3 },
  { slug: "smp", name: "SMP", emoji: "🌍", order: 4 },
  { slug: "diapot", name: "DiaPot", emoji: "⚡", order: 5 },
  { slug: "nethpot", name: "NethPot", emoji: "💀", order: 6 },
  { slug: "elytra", name: "Elytra", emoji: "🪂", order: 7 },
];

async function ensureDefaultGamemodes() {
  const count = await Gamemode.countDocuments();
  if (count === 0) {
    await Gamemode.insertMany(DEFAULT_GAMEMODES);
  }
}

router.get("/gamemodes", async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureDefaultGamemodes();
    const gamemodes = await Gamemode.find({ isActive: true }).sort({ order: 1, slug: 1 });
    res.json(gamemodes);
  } catch (err) {
    logger.error({ err }, "Failed to fetch gamemodes");
    res.status(500).json({ error: "server_error", message: "Failed to fetch gamemodes" });
  }
});

router.get("/gamemodes/all", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureDefaultGamemodes();
    const gamemodes = await Gamemode.find().sort({ order: 1, slug: 1 });
    res.json(gamemodes);
  } catch (err) {
    logger.error({ err }, "Failed to fetch all gamemodes");
    res.status(500).json({ error: "server_error", message: "Failed to fetch gamemodes" });
  }
});

const GamemodeBody = z.object({
  slug: z.string().min(1).max(32).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens"),
  name: z.string().min(1).max(64),
  emoji: z.string().min(1).max(8),
  isActive: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

router.post("/gamemodes", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = GamemodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  try {
    const exists = await Gamemode.findOne({ slug: parsed.data.slug });
    if (exists) {
      res.status(409).json({ error: "conflict", message: `Gamemode with slug "${parsed.data.slug}" already exists` });
      return;
    }
    const gm = await Gamemode.create(parsed.data);
    res.status(201).json(gm);
  } catch (err) {
    logger.error({ err }, "Failed to create gamemode");
    res.status(500).json({ error: "server_error", message: "Failed to create gamemode" });
  }
});

const GamemodeUpdateBody = z.object({
  name: z.string().min(1).max(64).optional(),
  emoji: z.string().min(1).max(8).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

router.patch("/gamemodes/:slug", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = GamemodeUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  try {
    const gm = await Gamemode.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: parsed.data },
      { new: true }
    );
    if (!gm) {
      res.status(404).json({ error: "not_found", message: "Gamemode not found" });
      return;
    }
    res.json(gm);
  } catch (err) {
    logger.error({ err }, "Failed to update gamemode");
    res.status(500).json({ error: "server_error", message: "Failed to update gamemode" });
  }
});

router.delete("/gamemodes/:slug", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const gm = await Gamemode.findOneAndDelete({ slug: req.params.slug });
    if (!gm) {
      res.status(404).json({ error: "not_found", message: "Gamemode not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete gamemode");
    res.status(500).json({ error: "server_error", message: "Failed to delete gamemode" });
  }
});

export default router;
