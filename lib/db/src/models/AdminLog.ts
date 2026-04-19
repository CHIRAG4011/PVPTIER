import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminLog extends Document {
  adminId: string;
  adminUsername: string;
  action: string;
  target: string;
  details?: string | null;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: String, required: true },
    adminUsername: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    details: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

AdminLogSchema.index({ createdAt: -1 });

export const AdminLog: Model<IAdminLog> =
  mongoose.models.AdminLog || mongoose.model<IAdminLog>("AdminLog", AdminLogSchema);
