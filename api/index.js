let expressApp;
let initError;
let initPromise;

async function initApp() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const mod = await import("../artifacts/api-server/dist/app.mjs");
      expressApp = mod.default;

      // Wait up to 8 seconds for MongoDB to connect before accepting requests
      const { default: mongoose } = await import("mongoose");
      if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("MongoDB connection timeout")), 8000);
          mongoose.connection.once("connected", () => { clearTimeout(timeout); resolve(); });
          mongoose.connection.once("error", (err) => { clearTimeout(timeout); reject(err); });
          if (mongoose.connection.readyState === 1) { clearTimeout(timeout); resolve(); }
        });
      }
    } catch (err) {
      initError = err;
      console.error("App failed to initialize:", err);
      throw err;
    }
  })();
  return initPromise;
}

export default async (req, res) => {
  try {
    await initApp();
  } catch (err) {
    res.status(500).json({
      error: "init_failed",
      message: initError?.message || err.message,
      hint: "Ensure MONGODB_URI and SESSION_SECRET are set in Vercel Environment Variables.",
    });
    return;
  }

  return expressApp(req, res);
};
