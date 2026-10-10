import type { AuthTokens, PublicUser } from "../api/auth";
import { ApiError, type ApiErrorBody, type ApiSuccessBody } from "../api/errors";

export const ACCESS_KEY = "tefabign.accessToken";
export const REFRESH_KEY = "tefabign.refreshToken";
export const USER_KEY = "tefabign.user";

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

let refreshInFlight: Promise<AuthTokens> | null = null;

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySessionListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function readStoredUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function readStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function persistUser(user: PublicUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore persistence failures.
  }
  notifySessionListeners();
}

export function persistTokens(tokens: AuthTokens): void {
  try {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {
    // Ignore persistence failures.
  }
  notifySessionListeners();
}

export function persistSession(user: PublicUser, tokens: AuthTokens): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {
    // Ignore persistence failures.
  }
  notifySessionListeners();
}

export function clearPersistedSession(): void {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore persistence failures.
  }
  notifySessionListeners();
}

/**
 * Rotates tokens via POST /auth/refresh.
 * Single-flight: concurrent callers share one request (refresh revokes the prior token).
 */
export async function refreshSessionTokens(): Promise<AuthTokens> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = readStoredRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is missing");
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = payload as ApiErrorBody | null;
      clearPersistedSession();
      throw new ApiError(
        response.status,
        error?.error?.code ?? "INVALID_REFRESH_TOKEN",
        error?.error?.message ?? "Refresh failed",
      );
    }

    const success = payload as ApiSuccessBody<{ tokens: AuthTokens }> | null;
    if (!success?.success || !success.data?.tokens) {
      clearPersistedSession();
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Unexpected refresh response");
    }

    persistTokens(success.data.tokens);
    return success.data.tokens;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
