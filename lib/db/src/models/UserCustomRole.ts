import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserCustomRole extends Document {
  userId: string;
  customRoleId: string;
  assignedBy?: string | null;
  assignedAt: Date;
}

const UserCustomRoleSchema = new Schema<IUserCustomRole>(
  {
    userId: { type: String, required: true },
    customRoleId: { type: String, required: true },
    assignedBy: { type: String, default: null },
    assignedAt: { type: Date, default: Date.now },
  },
  {
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

export const UserCustomRole: Model<IUserCustomRole> =
  mongoose.models.UserCustomRole ||
  mongoose.model<IUserCustomRole>("UserCustomRole", UserCustomRoleSchema);
