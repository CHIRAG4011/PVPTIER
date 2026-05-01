import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGamemode extends Document {
  slug: string;
  name: string;
  emoji: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const GamemodeSchema = new Schema<IGamemode>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    emoji: { type: String, default: "⚔️" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Gamemode: Model<IGamemode> =
  mongoose.models.Gamemode || mongoose.model<IGamemode>("Gamemode", GamemodeSchema);
