let expressApp;
let initError;

export default async (req, res) => {
  if (!expressApp && !initError) {
    try {
      const mod = await import("../dist/app.mjs");
      expressApp = mod.default;
    } catch (err) {
      initError = err;
      console.error("App failed to initialize:", err);
    }
  }

  if (initError) {
    res.status(500).json({
      error: "init_failed",
      message: initError.message,
    });
    return;
  }

  return expressApp(req, res);
};
