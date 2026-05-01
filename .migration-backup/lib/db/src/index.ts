import mongoose from "mongoose";

let connectionPromise: Promise<void> | null = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set.");
  }

  connectionPromise = mongoose
    .connect(uri, { dbName: "pvptiers", serverSelectionTimeoutMS: 10000 })
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

connectDB().catch(console.error);

export * from "./models/User";
export * from "./models/Player";
export * from "./models/Match";
export * from "./models/Submission";
export * from "./models/Ticket";
export * from "./models/Announcement";
export * from "./models/Season";
export * from "./models/AdminLog";
export * from "./models/SiteSetting";
export * from "./models/CustomRole";
export * from "./models/UserCustomRole";
export * from "./models/PasswordReset";
export * from "./models/Challenge";
export * from "./models/Notification";
