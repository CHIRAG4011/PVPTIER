import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomRole extends Document {
  name: string;
  color: string;
  icon?: string | null;
  permissions: string[];
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CustomRoleSchema = new Schema<ICustomRole>(
  {
    name: { type: String, required: true, unique: true },
    color: { type: String, default: "#888888" },
    icon: { type: String, default: "shield" },
    permissions: { type: [String], default: [] },
    createdBy: { type: String, default: null },
  },
  {
    timestamps: true,
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

export const CustomRole: Model<ICustomRole> =
  mongoose.models.CustomRole || mongoose.model<ICustomRole>("CustomRole", CustomRoleSchema);
