import { Router, type IRouter, type Request, type Response } from "express";
import { CustomRole, UserCustomRole, AdminLog } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import { ALL_PERMISSIONS } from "../lib/permissions";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/admin/roles", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const roles = await CustomRole.find().sort({ createdAt: 1 });

  const rolesWithMembers = await Promise.all(
    roles.map(async (role) => {
      const memberCount = await UserCustomRole.countDocuments({ customRoleId: role._id.toString() });
      return { ...role.toJSON(), id: role._id.toString(), memberCount };
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

  const role = await CustomRole.create({
    name: name.trim(),
    color: color || "#888888",
    icon: icon || "shield",
    permissions: validPerms,
    createdBy: adminUser.userId,
  });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "create_role",
    target: `role:${role._id}`,
    details: `Created role: ${role.name}`,
  });

  res.status(201).json({ ...role.toJSON(), id: role._id.toString() });
});

router.patch("/admin/roles/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const { name, color, icon, permissions } = req.body;
  const validPermsUpdate = Array.isArray(permissions)
    ? permissions.filter((p: string) => (ALL_PERMISSIONS as readonly string[]).includes(p))
    : undefined;

  const update: any = {};
  if (name) update.name = name.trim();
  if (color) update.color = color;
  if (icon !== undefined) update.icon = icon;
  if (validPermsUpdate !== undefined) update.permissions = validPermsUpdate;

  const updated = await CustomRole.findByIdAndUpdate(id, update, { new: true });

  await AdminLog.create({
    adminId: adminUser.userId,
    adminUsername: adminUser.username,
    action: "update_role",
    target: `role:${id}`,
    details: `Updated role #${id}`,
  });

  res.json({ ...updated?.toJSON(), id: updated?._id.toString() });
});

router.delete("/admin/roles/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  await Promise.all([
    UserCustomRole.deleteMany({ customRoleId: id }),
    CustomRole.findByIdAndDelete(id),
  ]);

  await AdminLog.create({
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
  const userId = req.params.id;
  const { roleId } = req.body;
  if (!userId || !roleId) {
    res.status(400).json({ error: "invalid_params" });
    return;
  }

  await UserCustomRole.findOneAndUpdate(
    { userId },
    { userId, customRoleId: roleId, assignedBy: adminUser.userId },
    { upsert: true }
  );

  await AdminLog.create({
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
  const userId = req.params.id;

  await UserCustomRole.deleteMany({ userId });

  await AdminLog.create({
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
