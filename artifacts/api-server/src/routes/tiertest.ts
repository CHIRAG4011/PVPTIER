import { Router, type IRouter, type Request, type Response } from "express";
import mongoose from "mongoose";
import { requireAuth, requireAdmin } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const TierTestSchema = new mongoose.Schema(
  {
    applicantId: { type: String, required: true },
    applicantUsername: { type: String, required: true },
    minecraftUsername: { type: String, required: true },
    currentTier: { type: String, required: true },
    requestedTier: { type: String, required: true },
    evidence: { type: String, default: null },
    notes: { type: String, default: null },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: String, default: null },
    reviewNote: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

const TierTest = mongoose.models.TierTest || mongoose.model("TierTest", TierTestSchema);

const router: IRouter = Router();

router.post("/tier-test/apply", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;

  const { minecraftUsername, currentTier, requestedTier, evidence, notes } = req.body;

  if (!minecraftUsername || !currentTier || !requestedTier) {
    res.status(400).json({ error: "validation_error", message: "minecraftUsername, currentTier, and requestedTier are required" });
    return;
  }

  const existing = await TierTest.findOne({ applicantId: user.userId, status: "pending" });
  if (existing) {
    res.status(409).json({ error: "conflict", message: "You already have a pending tier test application" });
    return;
  }

  const application = await TierTest.create({
    applicantId: user.userId,
    applicantUsername: user.username,
    minecraftUsername,
    currentTier,
    requestedTier,
    evidence: evidence ?? null,
    notes: notes ?? null,
  });

  res.status(201).json({ success: true, application: application.toJSON() });
});

router.get("/tier-test/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: JwtPayload }).user!;
  const applications = await TierTest.find({ applicantId: user.userId }).sort({ createdAt: -1 }).limit(5);
  res.json({ applications: applications.map((a: any) => a.toJSON()) });
});

router.get("/tier-test", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(String(req.query.page ?? 1), 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  const status = req.query.status ? String(req.query.status) : undefined;

  const filter: any = {};
  if (status && status !== "all") filter.status = status;

  const [applications, total] = await Promise.all([
    TierTest.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    TierTest.countDocuments(filter),
  ]);

  res.json({
    applications: applications.map((a: any) => a.toJSON()),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/tier-test/:id/approve", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid application ID" });
    return;
  }

  const { reviewNote } = req.body;

  const application = await TierTest.findById(id);
  if (!application) {
    res.status(404).json({ error: "not_found", message: "Application not found" });
    return;
  }

  await TierTest.findByIdAndUpdate(id, {
    status: "approved",
    reviewedBy: adminUser.userId,
    reviewNote: reviewNote ?? null,
  });

  const { Player } = await import("@workspace/db");
  await Player.findOneAndUpdate(
    { minecraftUsername: { $regex: `^${application.minecraftUsername}$`, $options: "i" } },
    { tier: application.requestedTier }
  );

  res.json({ success: true, message: "Tier test application approved and tier updated" });
});

router.post("/tier-test/:id/reject", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const adminUser = (req as Request & { user?: JwtPayload }).user!;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: "invalid_id", message: "Invalid application ID" });
    return;
  }

  const { reviewNote } = req.body;

  await TierTest.findByIdAndUpdate(id, {
    status: "rejected",
    reviewedBy: adminUser.userId,
    reviewNote: reviewNote ?? null,
  });

  res.json({ success: true, message: "Tier test application rejected" });
});

export default router;
