import { Router, type IRouter, type Request, type Response } from "express";
import { User } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { signToken, hashPassword, comparePasswords, requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

function formatUser(user: any) {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
    isBanned: user.isBanned,
    minecraftUsername: user.minecraftUsername,
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    createdAt: user.createdAt,
  };
}

router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { email, password, username, minecraftUsername } = parsed.data;

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    res.status(400).json({ error: "email_taken", message: "Email already registered" });
    return;
  }

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    res.status(400).json({ error: "username_taken", message: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    username,
    passwordHash,
    minecraftUsername: minecraftUsername ?? null,
    role: "user",
    isBanned: false,
  });

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
  });
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  const valid = await comparePasswords(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "banned", message: `Account banned: ${user.banReason}` });
    return;
  }

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
  });
  res.json({ token, user: formatUser(user) });
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as Request & { user?: JwtPayload }).user!;
  const user = await User.findById(authUser.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.post("/auth/logout", (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "Logged out" });
  return Promise.resolve();
});

export default router;
