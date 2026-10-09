import type { User } from "@prisma/client";
import type { PublicUser } from "../types/auth";

/** Privacy-safe user payload — never includes passwordHash or secrets. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}
