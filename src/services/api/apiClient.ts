import type { ApiErrorResponse, ApiSuccessResponse } from "../../types/api";

export interface ApiRequestOptions {
  accessToken?: string;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

interface ApiErrorPayload extends ApiErrorResponse {
  details?: unknown;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "The request was invalid.",
  401: "Authentication is required.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "The request conflicts with the current state.",
  500: "The server encountered an error.",
  503: "The service is temporarily unavailable.",
};

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.REACT_APP_API_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("REACT_APP_API_URL is not configured.");
  }
  return baseUrl;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false &&
    "message" in value &&
    typeof value.message === "string"
  );
}

function isApiSuccessPayload<T>(
  value: unknown,
): value is ApiSuccessResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === true &&
    "data" in value
  );
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly details?: unknown;

  constructor(message: string, status: number | null, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const url = `${getApiBaseUrl()}/${path.replace(/^\/+/, "")}`;
  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: options.credentials ?? "include",
      signal: options.signal,
      body: requestBody,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("Unable to connect to the API server.", null);
  }

  const responseText = await response.text();
  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new ApiError(
        response.ok
          ? "The API returned an invalid JSON response."
          : (STATUS_MESSAGES[response.status] ??
              `Request failed with status ${response.status}.`),
        response.status,
      );
    }
  }

  if (!response.ok || isApiErrorPayload(payload)) {
    const errorPayload = isApiErrorPayload(payload) ? payload : undefined;
    throw new ApiError(
      errorPayload?.message ??
        STATUS_MESSAGES[response.status] ??
        `Request failed with status ${response.status}.`,
      response.status,
      errorPayload?.details,
    );
  }

  if (isApiSuccessPayload<T>(payload)) {
    return payload.data;
  }
  return payload as T;
}

export const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>("POST", path, body, options);
  },
  patch<T>(
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return request<T>("PATCH", path, body, options);
  },
};
