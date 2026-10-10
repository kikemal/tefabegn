import { AccountStatus, Role, type User } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../db/prisma";
import type { AuthenticatedUser, PublicUser } from "../types/auth";
import { toPublicUser } from "./mapper";
import type { UpdateOwnProfileInput } from "./validation";

async function findActiveUserOrThrow(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }
  if (user.status !== AccountStatus.ACTIVE) {
    throw new AppError(403, "ACCOUNT_DISABLED", "This account is disabled");
  }
  return user;
}

export async function getOwnProfile(userId: string): Promise<PublicUser> {
  const user = await findActiveUserOrThrow(userId);
  return toPublicUser(user);
}

export async function updateOwnProfile(
  userId: string,
  input: UpdateOwnProfileInput,
): Promise<PublicUser> {
  const user = await findActiveUserOrThrow(userId);

  if (input.email && input.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError(409, "EMAIL_IN_USE", "An account with this email already exists");
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
  });

  return toPublicUser(updated);
}

/**
 * Object-level authorization:
 * - users may only read their own profile
 * - staff may read another user's privacy-safe profile
 */
export async function getProfileForViewer(
  viewer: AuthenticatedUser,
  targetUserId: string,
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });

  // Uniform 404 for unauthorized cross-user reads reduces ID enumeration.
  if (!user || (viewer.id !== targetUserId && viewer.role !== Role.STAFF)) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  // Non-staff viewing self still blocked if disabled (handled by requireAuth usually).
  if (viewer.id === targetUserId && user.status !== AccountStatus.ACTIVE) {
    throw new AppError(403, "ACCOUNT_DISABLED", "This account is disabled");
  }

  return toPublicUser(user);
}
