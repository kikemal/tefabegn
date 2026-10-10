import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true; // same-origin / non-browser clients
  }

  if (env.CORS_ORIGINS.length === 0) {
    // Development convenience only — production must set CORS_ORIGINS explicitly.
    return env.NODE_ENV !== "production";
  }

  return env.CORS_ORIGINS.includes(origin) || env.CORS_ORIGINS.includes("*");
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header("origin");

  if (isOriginAllowed(origin)) {
    const allowAny =
      env.CORS_ORIGINS.includes("*") ||
      (env.CORS_ORIGINS.length === 0 && env.NODE_ENV !== "production");

    if (allowAny) {
      res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    } else if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
