import type { AccountStatus, Role } from "@prisma/client";

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
};

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: AccountStatus;
};
