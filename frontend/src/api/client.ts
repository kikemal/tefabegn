export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = payload as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      error?.error?.code ?? "INTERNAL_SERVER_ERROR",
      error?.error?.message ?? "Request failed",
    );
  }

  const success = payload as ApiSuccessBody<T> | null;
  if (!success?.success) {
    throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Unexpected response");
  }

  return success.data;
}
