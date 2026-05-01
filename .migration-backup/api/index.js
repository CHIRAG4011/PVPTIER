let expressApp;
let initError;
let initPromise;

async function initApp() {
  if (expressApp) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const mod = await import("../artifacts/api-server/dist/app.mjs");
      expressApp = mod.default;

      const { default: mongoose } = await import("mongoose");

      if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("MongoDB connection timeout after 15s. Ensure MONGODB_URI is set in Vercel Environment Variables and your IP is whitelisted in MongoDB Atlas.")),
            15000
          );

          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
            return;
          }

          mongoose.connection.once("connected", () => {
            clearTimeout(timeout);
            resolve();
          });
          mongoose.connection.once("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      }

      initError = null;
    } catch (err) {
      initError = err;
      initPromise = null;
      console.error("App failed to initialize:", err?.message || err);
      throw err;
    }
  })();

  return initPromise;
}

export default async (req, res) => {
  try {
    await initApp();
  } catch (err) {
    const msg = initError?.message || err?.message || "Unknown initialization error";
    res.status(500).json({
      error: "init_failed",
      message: msg,
      hint: "Ensure MONGODB_URI and SESSION_SECRET are set in Vercel Environment Variables, and your MongoDB Atlas cluster allows connections from all IPs (0.0.0.0/0).",
    });
    return;
  }

  return expressApp(req, res);
};
