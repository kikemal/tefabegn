import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, prefix: string): string {
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.ip || req.socket.remoteAddress || "unknown";
  return `${prefix}:${ip}`;
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  /**
   * When true, always enforce.
   * When false, always skip.
   * When omitted, use env (`RATE_LIMIT_ENABLED` and not test).
   */
  forceEnabled?: boolean;
}) {
  return function rateLimiter(req: Request, _res: Response, next: NextFunction): void {
    const enabled =
      options.forceEnabled === true
        ? true
        : options.forceEnabled === false
          ? false
          : env.NODE_ENV !== "test" && Boolean(env.RATE_LIMIT_ENABLED);

    if (!enabled) {
      next();
      return;
    }

    const key = clientKey(req, options.keyPrefix);
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.max) {
      next(new AppError(429, "RATE_LIMITED", "Too many requests. Please wait and try again."));
      return;
    }

    next();
  };
}

/** Auth endpoints are the highest abuse risk for credential stuffing. */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: "auth",
});

/** General API limiter (per IP). */
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyPrefix: "api",
});

/** Test helper — clears in-memory buckets. */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
