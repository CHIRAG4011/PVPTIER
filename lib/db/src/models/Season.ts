import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISeason extends Document {
  name: string;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
  createdAt: Date;
}

const SeasonSchema = new Schema<ISeason>(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: false },
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

export const Season: Model<ISeason> =
  mongoose.models.Season || mongoose.model<ISeason>("Season", SeasonSchema);
