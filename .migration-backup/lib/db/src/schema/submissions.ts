import { pgTable, serial, timestamp, integer, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const submissionStatusEnum = pgEnum("submission_status", ["pending", "approved", "rejected"]);

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  submitterId: integer("submitter_id").notNull().references(() => usersTable.id),
  submitterUsername: text("submitter_username").notNull(),
  opponentUsername: text("opponent_username").notNull(),
  gamemode: text("gamemode").notNull(),
  result: text("result").notNull(),
  status: submissionStatusEnum("status").notNull().default("pending"),
  evidence: text("evidence"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
