import { pgTable, serial, timestamp, text, integer } from "drizzle-orm/pg-core";

export const customRolesTable = pgTable("custom_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#888888"),
  icon: text("icon").default("shield"),
  permissions: text("permissions").array().notNull().default([]),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userCustomRolesTable = pgTable("user_custom_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  customRoleId: integer("custom_role_id").notNull(),
  assignedBy: integer("assigned_by"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CustomRole = typeof customRolesTable.$inferSelect;
export type UserCustomRole = typeof userCustomRolesTable.$inferSelect;
