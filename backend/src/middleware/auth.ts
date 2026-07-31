import { expressjwt } from "express-jwt";
import jwksRsa from "jwks-rsa";
import { config } from "../config";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  auth?: {
    oid?: string;
    upn?: string;
    preferred_username?: string;
    roles?: string[];
  };
}

export const requireAuth = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: config.jwksUri,
  }) as jwksRsa.GetVerificationKey,
  audience: config.jwtAudience,
  issuer: config.jwtIssuer,
  algorithms: ["RS256"],
});

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.auth?.roles?.includes("SecondLook.Admin")) {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  next();
}

export function getCallerUpn(req: AuthenticatedRequest): string {
  return req.auth?.upn ?? req.auth?.preferred_username ?? "unknown";
}
