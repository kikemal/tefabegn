import { clearPersistedSession, refreshSessionTokens } from "../auth/sessionStore";
import { ApiError, type ApiErrorBody, type ApiSuccessBody } from "./errors";

export { ApiError, type ApiErrorBody, type ApiSuccessBody } from "./errors";

export type ApiRequestOptions = {
  /** Skip access-token refresh/retry (login, register, refresh, logout). */
  skipAuthRefresh?: boolean;
};

function shouldAttemptRefresh(path: string, skipAuthRefresh: boolean | undefined): boolean {
  if (skipAuthRefresh) {
    return false;
  }
  return (
    path !== "/auth/login" &&
    path !== "/auth/register" &&
    path !== "/auth/refresh" &&
    path !== "/auth/logout"
  );
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function throwFromPayload(status: number, payload: unknown): never {
  const error = payload as ApiErrorBody | null;
  throw new ApiError(
    status,
    error?.error?.code ?? "INTERNAL_SERVER_ERROR",
    error?.error?.message ?? "Request failed",
  );
}

function unwrapData<T>(payload: unknown): T {
  const success = payload as ApiSuccessBody<T> | null;
  if (!success?.success) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Unexpected response");
  }
  return success.data;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });

  const payload = await parseJson(response);

  if (response.status === 401 && shouldAttemptRefresh(path, options.skipAuthRefresh)) {
    try {
      const tokens = await refreshSessionTokens();
      const retryHeaders = new Headers(init.headers);
      if (init.body && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${tokens.accessToken}`);

      const retryResponse = await fetch(`/api${path}`, {
        ...init,
        headers: retryHeaders,
      });
      const retryPayload = await parseJson(retryResponse);

      if (!retryResponse.ok) {
        if (retryResponse.status === 401 || retryResponse.status === 403) {
          clearPersistedSession();
        }
        throwFromPayload(retryResponse.status, retryPayload);
      }

      return unwrapData<T>(retryPayload);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      clearPersistedSession();
      throwFromPayload(response.status, payload);
    }
  }

  if (!response.ok) {
    if (shouldAttemptRefresh(path, options.skipAuthRefresh)) {
      const code = (payload as ApiErrorBody | null)?.error?.code;
      if (code === "ACCOUNT_DISABLED" || response.status === 401) {
        clearPersistedSession();
      }
    }
    throwFromPayload(response.status, payload);
  }

  return unwrapData<T>(payload);
}
