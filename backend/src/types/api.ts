export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export function ok<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): ApiErrorResponse {
  return {
    success: false,
    error: { code, message },
  };
}
