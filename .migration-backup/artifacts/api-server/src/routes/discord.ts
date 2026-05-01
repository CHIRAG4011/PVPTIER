import { Router, type IRouter, type Request, type Response } from "express";
import { User } from "@workspace/db";
import { signToken } from "../lib/auth.js";

const router: IRouter = Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

function getRedirectUri(req: Request): string {
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}/api/auth/discord/callback`;
}

function getFrontendUrl(req: Request): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = (req.headers["x-forwarded-host"] || req.get("host") || "").toString();
  const devFrontendPort = "24684";
  const apiPort = process.env.PORT || "8080";
  const frontendHost = host.replace(`:${apiPort}`, `:${devFrontendPort}`);
  return `${proto}://${frontendHost}`;
}

router.get("/auth/discord", (req: Request, res: Response): void => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.status(500).json({ error: "Discord OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET." });
    return;
  }

  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

router.get("/auth/discord/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, error } = req.query as { code?: string; error?: string };
  const frontendUrl = getFrontendUrl(req);

  if (error || !code) {
    res.redirect(`${frontendUrl}/login?error=discord_denied`);
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Discord token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error(`Failed to fetch Discord user: ${userRes.status}`);
    }

    const discordUser = await userRes.json() as {
      id: string;
      username: string;
      email?: string;
      avatar?: string | null;
      discriminator?: string;
    };

    const discordEmail = discordUser.email || `discord_${discordUser.id}@discord.local`;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    let user = await User.findOne({ discordId: discordUser.id });

    if (!user) {
      user = await User.findOne({ email: discordEmail.toLowerCase() });
    }

    if (user) {
      await User.findByIdAndUpdate(user._id, {
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: avatarUrl,
      });
      user = await User.findById(user._id);
    } else {
      let username = discordUser.username;
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${discordUser.username}_${discordUser.id.slice(-4)}`;
      }

      user = await User.create({
        email: discordEmail.toLowerCase(),
        username,
        passwordHash: null,
        role: "user",
        isBanned: false,
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: avatarUrl,
      });
    }

    if (!user) throw new Error("Failed to find or create user");

    if (user.isBanned) {
      res.redirect(`${frontendUrl}/login?error=banned`);
      return;
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    res.redirect(`${frontendUrl}/oauth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("Discord OAuth error:", err);
    res.redirect(`${frontendUrl}/login?error=discord_failed`);
  }
});

export default router;
