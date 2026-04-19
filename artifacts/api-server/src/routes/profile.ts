import { Router, type IRouter, type Request, type Response } from "express";
import { User, PasswordReset } from "@workspace/db";
import { requireAuth, hashPassword, comparePasswords, signToken } from "../lib/auth";
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

  const existing = await User.findOne({ username: trimmed });
  if (existing && existing._id.toString() !== authUser.userId) {
    res.status(400).json({ error: "username_taken", message: "Username already taken" });
    return;
  }

  await User.findByIdAndUpdate(authUser.userId, { username: trimmed });

  const user = await User.findById(authUser.userId);
  const newToken = signToken({
    userId: authUser.userId,
    email: user!.email,
    username: user!.username,
    role: user!.role,
  });

  res.json({ success: true, message: "Username updated", token: newToken });
});

router.patch("/users/me/avatar", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { avatarUrl } = req.body;

  if (avatarUrl && typeof avatarUrl === "string") {
    try { new URL(avatarUrl); } catch {
      res.status(400).json({ error: "validation_error", message: "Invalid URL format" });
      return;
    }
  }

  await User.findByIdAndUpdate(authUser.userId, { avatarUrl: avatarUrl || null });
  res.json({ success: true, message: "Avatar updated" });
});

router.patch("/users/me/bio", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { bio } = req.body;
  await User.findByIdAndUpdate(authUser.userId, { bio: bio || null });
  res.json({ success: true, message: "Bio updated" });
});

router.patch("/users/me/password", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "validation_error", message: "New password must be at least 8 characters" });
    return;
  }

  const user = await User.findById(authUser.userId);
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
  await User.findByIdAndUpdate(authUser.userId, { passwordHash: newHash });
  res.json({ success: true, message: "Password changed" });
});

router.post("/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "validation_error", message: "Email is required" });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.json({ success: true, message: "If that email exists, a reset token has been generated." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordReset.deleteMany({ userId: user._id.toString() });
  await PasswordReset.create({ userId: user._id.toString(), token, expiresAt, used: false });

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

  const reset = await PasswordReset.findOne({ token });
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    res.status(400).json({ error: "invalid_token", message: "Reset token is invalid or expired" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(reset.userId, { passwordHash: newHash });
  await PasswordReset.findByIdAndUpdate(reset._id, { used: true });

  res.json({ success: true, message: "Password reset successfully. You can now log in." });
});

export default router;
