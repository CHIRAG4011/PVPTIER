import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChallenge extends Document {
  challengerId: string;
  challengerUsername: string;
  challengerMcUsername: string;
  opponentUserId?: string | null;
  opponentUsername: string;
  gamemode: string;
  server: string;
  scheduledTime: Date;
  notes?: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "completed";
  rejectReason?: string | null;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    challengerId: { type: String, required: true, index: true },
    challengerUsername: { type: String, required: true },
    challengerMcUsername: { type: String, required: true },
    opponentUserId: { type: String, default: null, index: true },
    opponentUsername: { type: String, required: true },
    gamemode: { type: String, required: true },
    server: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    rejectReason: { type: String, default: null },
    respondedAt: { type: Date, default: null },
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

ChallengeSchema.index({ createdAt: -1 });

export const Challenge: Model<IChallenge> =
  mongoose.models.Challenge || mongoose.model<IChallenge>("Challenge", ChallengeSchema);
