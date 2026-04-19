import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI must be set.");
}

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(MONGODB_URI!, { dbName: "pvptiers" });
  isConnected = true;
  console.log("MongoDB connected");
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
