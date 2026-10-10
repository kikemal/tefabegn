import { apiRequest } from "./client";

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "STAFF";
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
};

export type AuthSession = {
  user: PublicUser;
  tokens: AuthTokens;
};

export function loginRequest(email: string, password: string) {
  return apiRequest<AuthSession>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { skipAuthRefresh: true },
  );
}

export function registerRequest(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  return apiRequest<AuthSession>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { skipAuthRefresh: true },
  );
}

export function logoutRequest(refreshToken: string) {
  return apiRequest<{ loggedOut: true }>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    { skipAuthRefresh: true },
  );
}

export function refreshRequest(refreshToken: string) {
  return apiRequest<{ tokens: AuthTokens }>(
    "/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    },
    { skipAuthRefresh: true },
  );
}

export function meRequest(accessToken: string) {
  return apiRequest<{ user: PublicUser }>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
