import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { User } from "@workspace/db";
import { hashPassword } from "./lib/auth.js";

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

async function ensureAdminAccount() {
  try {
    const existing = await User.findOne({ email: "admin@pvp.gg" });
    if (!existing) {
      const passwordHash = await hashPassword("Admin1234!");
      await User.create({
        email: "admin@pvp.gg",
        username: "Admin",
        passwordHash,
        role: "superadmin",
        isBanned: false,
      });
      logger.info("Default admin account created (admin@pvp.gg)");
    }
  } catch (err) {
    logger.warn({ err }, "Could not ensure admin account (will retry on next start)");
  }
}

ensureAdminAccount();

export default app;
