import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatch extends Document {
  winnerId: string;
  loserId: string;
  winnerUsername: string;
  loserUsername: string;
  gamemode: string;
  eloChange: number;
  playedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    winnerId: { type: String, required: true },
    loserId: { type: String, required: true },
    winnerUsername: { type: String, required: true },
    loserUsername: { type: String, required: true },
    gamemode: { type: String, required: true },
    eloChange: { type: Number, default: 25 },
    playedAt: { type: Date, default: Date.now },
  },
  {
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

MatchSchema.index({ playedAt: -1 });

export const Match: Model<IMatch> =
  mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);
