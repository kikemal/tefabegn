import { AccountStatus, Role, type User } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import type { AuthTokenPair, PublicUser } from "../types/auth";
import { toPublicUser } from "../users/mapper";
import { getOwnProfile } from "../users/service";
import { hashPassword, verifyPassword } from "./passwords";
import { createRefreshTokenValue, hashRefreshToken, signAccessToken } from "./tokens";
import type { LoginInput, RegisterInput } from "./validation";

export { getOwnProfile as getUserById };

async function issueTokenPair(user: User): Promise<AuthTokenPair> {
  const refreshToken = createRefreshTokenValue();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken: signAccessToken(user.id, user.role),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  };
}

export async function registerUser(input: RegisterInput): Promise<{
  user: PublicUser;
  tokens: AuthTokenPair;
}> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: Role.USER,
      status: AccountStatus.ACTIVE,
    },
  });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), tokens };
}

/** Dummy bcrypt hash so missing users still pay verify cost (timing hardening). */
const LOGIN_DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

export async function loginUser(input: LoginInput): Promise<{
  user: PublicUser;
  tokens: AuthTokenPair;
}> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Always run a password compare to reduce account-enumeration timing signals.
  const passwordValid = await verifyPassword(
    input.password,
    user?.passwordHash ?? LOGIN_DUMMY_HASH,
  );

  if (!user || !passwordValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (user.status !== AccountStatus.ACTIVE) {
    throw new AppError(403, "ACCOUNT_DISABLED", "This account is disabled");
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), tokens };
}

export async function refreshSession(refreshToken: string): Promise<AuthTokenPair> {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  if (stored.user.status !== AccountStatus.ACTIVE) {
    throw new AppError(403, "ACCOUNT_DISABLED", "This account is disabled");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair(stored.user);
}

export async function logoutSession(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
}
