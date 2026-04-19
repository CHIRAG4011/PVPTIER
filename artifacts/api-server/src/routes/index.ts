import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import playersRouter from "./players";
import leaderboardRouter from "./leaderboard";
import submissionsRouter from "./submissions";
import ticketsRouter from "./tickets";
import adminRouter from "./admin";
import announcementsRouter from "./announcements";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(playersRouter);
router.use(leaderboardRouter);
router.use(submissionsRouter);
router.use(ticketsRouter);
router.use(adminRouter);
router.use(announcementsRouter);
router.use(statsRouter);

export default router;
