import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  typ: "access";
};

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
    typ: "access",
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid access token");
  }

  const payload = decoded as Partial<AccessTokenPayload>;
  if (payload.typ !== "access" || typeof payload.sub !== "string" || !payload.role) {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: payload.sub,
    role: payload.role,
    typ: "access",
  };
}

export function createRefreshTokenValue(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
