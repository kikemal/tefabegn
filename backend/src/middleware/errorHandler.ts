import type { NextFunction, Request, Response } from "express";
import { fail } from "../types/api";
import { logSafeError } from "./safeLog";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(fail("NOT_FOUND", "Route not found"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(fail(err.code, err.message));
    return;
  }

  // express.json() syntax errors
  if (err instanceof SyntaxError) {
    res.status(400).json(fail("VALIDATION_ERROR", "Invalid JSON body"));
    return;
  }

  // Payload too large
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json(fail("PAYLOAD_TOO_LARGE", "Request body is too large"));
    return;
  }

  logSafeError("Unhandled error:", err);
  res.status(500).json(fail("INTERNAL_SERVER_ERROR", "An unexpected error occurred"));
}
