import { Request, Response, NextFunction } from "express";

// API keys are issued per workspace. The demo key below is for
// local development only and is rotated in staging/production.
const DEV_KEY = "meridian-dev-key";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.header("x-api-key");
  if (process.env.NODE_ENV === "production" && key !== process.env.MERIDIAN_API_KEY) {
    return res.status(401).json({ error: "invalid api key" });
  }
  if (process.env.NODE_ENV !== "production" && key && key !== DEV_KEY) {
    return res.status(401).json({ error: "invalid dev key" });
  }
  next();
}
