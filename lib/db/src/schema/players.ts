import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tierEnum = pgEnum("tier", ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"]);
export const gamemodeEnum = pgEnum("gamemode", ["sword", "axe", "uhc", "vanilla", "smp", "diapot", "nethpot", "elytra"]);

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  minecraftUsername: text("minecraft_username").notNull(),
  minecraftUuid: text("minecraft_uuid"),
  tier: tierEnum("tier").notNull().default("LT1"),
  elo: integer("elo").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  discordUsername: text("discord_username"),
  region: text("region").default("NA"),
  badges: text("badges").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const gamemodeStatsTable = pgTable("gamemode_stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id),
  gamemode: gamemodeEnum("gamemode").notNull(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  elo: integer("elo").notNull().default(1000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;

export const insertGamemodeStatSchema = createInsertSchema(gamemodeStatsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGamemodeStat = z.infer<typeof insertGamemodeStatSchema>;
export type GamemodeStat = typeof gamemodeStatsTable.$inferSelect;
