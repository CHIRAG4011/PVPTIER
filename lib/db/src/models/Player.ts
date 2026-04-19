import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGamemodeStat {
  gamemode: string;
  wins: number;
  losses: number;
  elo: number;
}

export interface IPlayer extends Document {
  userId?: string | null;
  minecraftUsername: string;
  minecraftUuid?: string | null;
  tier: "LT1" | "LT2" | "LT3" | "LT4" | "LT5" | "HT1" | "HT2" | "HT3" | "HT4" | "HT5";
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  discordUsername?: string | null;
  region: string;
  badges: string[];
  gamemodeStats: IGamemodeStat[];
  createdAt: Date;
  updatedAt: Date;
}

const GamemodeStatSchema = new Schema<IGamemodeStat>(
  {
    gamemode: { type: String, required: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    elo: { type: Number, default: 1000 },
  },
  { _id: false }
);

const PlayerSchema = new Schema<IPlayer>(
  {
    userId: { type: String, default: null },
    minecraftUsername: { type: String, required: true },
    minecraftUuid: { type: String, default: null },
    tier: {
      type: String,
      enum: ["LT1", "LT2", "LT3", "LT4", "LT5", "HT1", "HT2", "HT3", "HT4", "HT5"],
      default: "LT1",
    },
    elo: { type: Number, default: 1000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    discordUsername: { type: String, default: null },
    region: { type: String, default: "NA" },
    badges: { type: [String], default: [] },
    gamemodeStats: { type: [GamemodeStatSchema], default: [] },
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

PlayerSchema.index({ elo: -1 });
PlayerSchema.index({ minecraftUsername: 1 });

export const Player: Model<IPlayer> =
  mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);
