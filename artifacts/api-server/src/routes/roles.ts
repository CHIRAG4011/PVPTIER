import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, customRolesTable, userCustomRolesTable, adminLogsTable, usersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import { ALL_PERMISSIONS } from "../lib/permissions";

const router: IRouter = Router();

router.get("/admin/roles", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const roles = await db.select().from(customRolesTable).orderBy(customRolesTable.createdAt);

  const rolesWithMembers = await Promise.all(
    roles.map(async (role) => {
      const members = await db.select().from(userCustomRolesTable).where(eq(userCustomRolesTable.customRoleId, role.id));
      return { ...role, memberCount: members.length };
    })
  );

  res.json({ roles: rolesWithMembers });
});

router.post("/admin/roles", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { name, color, icon, permissions } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "validation_error", message: "Role name is required" });
    return;
  }

  const validPerms = Array.isArray(permissions)
    ? permissions.filter((p: string) => (ALL_PERMISSIONS as readonly string[]).includes(p))
    : [];

  const [role] = await db.insert(customRolesTable).values({
    name: name.trim(),
    color: color || "#888888",
    icon: icon || "shield",
    permissions: validPerms,
    createdBy: adminUser.userId,
  }).returning();

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "create_role",
    target: `role:${role.id}`,
    details: `Created role: ${role.name}`,
  });

  res.status(201).json(role);
});

router.patch("/admin/roles/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }

  const { name, color, icon, permissions } = req.body;
  const validPermsUpdate = Array.isArray(permissions)
    ? permissions.filter((p: string) => (ALL_PERMISSIONS as readonly string[]).includes(p))
    : undefined;

  await db.update(customRolesTable).set({
    ...(name ? { name: name.trim() } : {}),
    ...(color ? { color } : {}),
    ...(icon !== undefined ? { icon } : {}),
    ...(validPermsUpdate !== undefined ? { permissions: validPermsUpdate } : {}),
    updatedAt: new Date(),
  }).where(eq(customRolesTable.id, id));

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "update_role",
    target: `role:${id}`,
    details: `Updated role #${id}`,
  });

  const [updated] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, id));
  res.json(updated);
});

router.delete("/admin/roles/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid_id" }); return; }

  await db.delete(userCustomRolesTable).where(eq(userCustomRolesTable.customRoleId, id));
  await db.delete(customRolesTable).where(eq(customRolesTable.id, id));

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "delete_role",
    target: `role:${id}`,
    details: `Deleted role #${id}`,
  });

  res.json({ success: true });
});

router.post("/admin/users/:id/custom-role", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const userId = parseInt(req.params.id, 10);
  const { roleId } = req.body;
  if (isNaN(userId) || !roleId) { res.status(400).json({ error: "invalid_params" }); return; }

  const existing = await db.select().from(userCustomRolesTable)
    .where(eq(userCustomRolesTable.userId, userId)).limit(1);
  
  if (existing.length > 0) {
    await db.update(userCustomRolesTable).set({ customRoleId: roleId, assignedBy: adminUser.userId }).where(eq(userCustomRolesTable.userId, userId));
  } else {
    await db.insert(userCustomRolesTable).values({ userId, customRoleId: roleId, assignedBy: adminUser.userId });
  }

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "assign_custom_role",
    target: `user:${userId}`,
    details: `Assigned custom role #${roleId}`,
  });

  res.json({ success: true });
});

router.delete("/admin/users/:id/custom-role", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "invalid_id" }); return; }

  await db.delete(userCustomRolesTable).where(eq(userCustomRolesTable.userId, userId));

  await db.insert(adminLogsTable).values({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "remove_custom_role",
    target: `user:${userId}`,
    details: `Removed custom role from user #${userId}`,
  });

  res.json({ success: true });
});

router.get("/admin/permissions", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  res.json({ permissions: ALL_PERMISSIONS });
});

export default router;
