import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITicketReply extends Document {
  ticketId: string;
  userId: string;
  username: string;
  message: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface ITicket extends Document {
  userId: string;
  username: string;
  category: "bug" | "report" | "appeal" | "other";
  subject: string;
  status: "open" | "pending" | "closed";
  priority: "low" | "medium" | "high";
  assignedTo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TicketReplySchema = new Schema<ITicketReply>(
  {
    ticketId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    message: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
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

const TicketSchema = new Schema<ITicket>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    category: { type: String, enum: ["bug", "report", "appeal", "other"], required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ["open", "pending", "closed"], default: "open" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    assignedTo: { type: String, default: null },
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

TicketSchema.index({ createdAt: -1 });

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);

export const TicketReply: Model<ITicketReply> =
  mongoose.models.TicketReply || mongoose.model<ITicketReply>("TicketReply", TicketReplySchema);
