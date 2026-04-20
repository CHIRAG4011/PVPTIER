let expressApp;

export default async (req, res) => {
  if (!expressApp) {
    expressApp = (await import("../artifacts/api-server/dist/app.mjs")).default;
  }
  return expressApp(req, res);
};
