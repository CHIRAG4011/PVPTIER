import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, passwordResetsTable } from "@workspace/db";
import { requireAuth, hashPassword, comparePasswords, verifyToken, signToken } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import crypto from "crypto";

const router: IRouter = Router();

router.patch("/users/me/username", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { username } = req.body;

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    res.status(400).json({ error: "validation_error", message: "Username must be at least 3 characters" });
    return;
  }

  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    res.status(400).json({ error: "validation_error", message: "Username can only contain letters, numbers, underscores, and hyphens" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, trimmed)).limit(1);
  if (existing.length > 0 && existing[0].id !== authUser.userId) {
    res.status(400).json({ error: "username_taken", message: "Username already taken" });
    return;
  }

  await db.update(usersTable).set({ username: trimmed, updatedAt: new Date() }).where(eq(usersTable.id, authUser.userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.userId)).limit(1);
  const newToken = signToken({ userId: user.id, email: user.email, username: user.username, role: user.role });

  res.json({ success: true, message: "Username updated", token: newToken });
});

router.patch("/users/me/avatar", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { avatarUrl } = req.body;

  if (avatarUrl && typeof avatarUrl === "string") {
    try {
      new URL(avatarUrl);
    } catch {
      res.status(400).json({ error: "validation_error", message: "Invalid URL format" });
      return;
    }
  }

  await db.update(usersTable).set({ avatarUrl: avatarUrl || null, updatedAt: new Date() }).where(eq(usersTable.id, authUser.userId));
  res.json({ success: true, message: "Avatar updated" });
});

router.patch("/users/me/bio", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { bio } = req.body;

  await db.update(usersTable).set({ bio: bio || null, updatedAt: new Date() }).where(eq(usersTable.id, authUser.userId));
  res.json({ success: true, message: "Bio updated" });
});

router.patch("/users/me/password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "validation_error", message: "New password must be at least 8 characters" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.userId)).limit(1);
  if (!user?.passwordHash) {
    res.status(400).json({ error: "no_password", message: "Account uses social login" });
    return;
  }

  const valid = await comparePasswords(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "invalid_password", message: "Current password is incorrect" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, authUser.userId));
  res.json({ success: true, message: "Password changed" });
});

router.post("/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "validation_error", message: "Email is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.json({ success: true, message: "If that email exists, a reset token has been generated." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.delete(passwordResetsTable).where(eq(passwordResetsTable.userId, user.id));
  await db.insert(passwordResetsTable).values({ userId: user.id, token, expiresAt, used: false });

  res.json({
    success: true,
    message: "Reset token generated.",
    resetToken: token,
    note: "Share this token with the user. They can use it at /reset-password",
    expiresAt: expiresAt.toISOString(),
  });
});

router.post("/auth/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "validation_error", message: "Token and new password (min 8 chars) are required" });
    return;
  }

  const [reset] = await db.select().from(passwordResetsTable).where(eq(passwordResetsTable.token, token)).limit(1);
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    res.status(400).json({ error: "invalid_token", message: "Reset token is invalid or expired" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, reset.userId));
  await db.update(passwordResetsTable).set({ used: true }).where(eq(passwordResetsTable.token, token));

  res.json({ success: true, message: "Password reset successfully. You can now log in." });
});

export default router;
