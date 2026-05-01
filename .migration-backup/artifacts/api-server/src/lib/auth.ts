import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.SESSION_SECRET || "pvp-leaderboard-secret-key-2024";

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "No token provided" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return;
  }
  (req as Request & { user?: JwtPayload }).user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, async () => {
    const jwtUser = (req as Request & { user?: JwtPayload }).user;
    if (!jwtUser) {
      res.status(403).json({ error: "forbidden", message: "Admin access required" });
      return;
    }
    try {
      const { User } = await import("@workspace/db");
      const dbUser = await User.findById(jwtUser.userId).select("role isBanned").lean();
      if (!dbUser || dbUser.isBanned || !["admin", "superadmin", "moderator"].includes((dbUser as any).role)) {
        res.status(403).json({ error: "forbidden", message: "Admin access required" });
        return;
      }
      (req as Request & { user?: JwtPayload }).user = { ...jwtUser, role: (dbUser as any).role };
    } catch {
      res.status(500).json({ error: "server_error", message: "Failed to verify role" });
      return;
    }
    next();
  });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      (req as Request & { user?: JwtPayload }).user = payload;
    }
  }
  next();
}
