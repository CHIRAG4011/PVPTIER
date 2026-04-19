import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash?: string | null;
  role: "user" | "moderator" | "admin" | "superadmin";
  isBanned: boolean;
  banReason?: string | null;
  minecraftUsername?: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  discordAvatar?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ["user", "moderator", "admin", "superadmin"], default: "user" },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    minecraftUsername: { type: String, default: null },
    discordId: { type: String, default: null },
    discordUsername: { type: String, default: null },
    discordAvatar: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: null },
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

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
