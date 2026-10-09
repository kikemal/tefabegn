import type { NextFunction, Request, Response } from "express";
import { AccountStatus, Role } from "@prisma/client";
import { verifyAccessToken } from "../auth/tokens";
import { prisma } from "../db/prisma";
import { AppError } from "./errorHandler";

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    return;
  }

  if (req.user.role !== Role.STAFF) {
    next(new AppError(403, "FORBIDDEN", "Staff authorization required"));
    return;
  }

  next();
}
