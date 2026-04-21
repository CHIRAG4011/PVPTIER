import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubmission extends Document {
  submitterId: string;
  submitterUsername: string;
  opponentUsername: string;
  gamemode: string;
  result?: string | null;
  status: "pending" | "approved" | "rejected";
  evidence?: string | null;
  reviewedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    submitterId: { type: String, required: true },
    submitterUsername: { type: String, required: true },
    opponentUsername: { type: String, required: true },
    gamemode: { type: String, required: true },
    result: { type: String, default: null },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    evidence: { type: String, default: null },
    reviewedBy: { type: String, default: null },
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

export const Submission: Model<ISubmission> =
  mongoose.models.Submission || mongoose.model<ISubmission>("Submission", SubmissionSchema);
