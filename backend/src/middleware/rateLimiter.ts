import rateLimit from "express-rate-limit";
import { AuthenticatedRequest } from "./auth";

// Per-reporter: max reports per day. Config is loaded at route time,
// but we enforce the hard ceiling here to prevent abuse even if config changes.
export const reportRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 50, // hard ceiling — admin config's maxReportsPerDay is the softer limit checked in the route
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.auth?.upn ?? authReq.auth?.preferred_username ?? req.ip ?? "anon";
  },
  message: { error: "Daily report limit reached. Try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
