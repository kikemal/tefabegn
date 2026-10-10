import type { NextFunction, Request, Response } from "express";

/** Baseline API security headers (no third-party dependency). */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Cache-Control", "no-store");
  res.removeHeader("X-Powered-By");
  next();
}
