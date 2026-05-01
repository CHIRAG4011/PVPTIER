import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  winnerId: integer("winner_id").notNull().references(() => playersTable.id),
  loserId: integer("loser_id").notNull().references(() => playersTable.id),
  winnerUsername: text("winner_username").notNull(),
  loserUsername: text("loser_username").notNull(),
  gamemode: text("gamemode").notNull(),
  eloChange: integer("elo_change").notNull().default(25),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
