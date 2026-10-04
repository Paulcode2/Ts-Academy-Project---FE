import { apiClient } from "./api/apiClient";
import { API_ENDPOINTS } from "./api/apiEndpoints";
import type {
  AuthUser,
  ChangePasswordRequest,
  LoginCredentials,
  LoginResponse,
  RefreshResponse,
} from "../types/auth";

const COOKIE_REQUEST = { credentials: "include" as RequestCredentials };
const NO_AUTH_RETRY = { ...COOKIE_REQUEST, skipAuthRefresh: true };

export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>(
    API_ENDPOINTS.auth.login,
    credentials,
    NO_AUTH_RETRY,
  );
}

export function refreshSession(): Promise<RefreshResponse> {
  return apiClient.post<RefreshResponse>(
    API_ENDPOINTS.auth.refresh,
    undefined,
    NO_AUTH_RETRY,
  );
}

export function logout(): Promise<unknown> {
  return apiClient.post<unknown>(
    API_ENDPOINTS.auth.logout,
    undefined,
    NO_AUTH_RETRY,
  );
}

export function getCurrentUser(
  accessToken?: string,
  skipAuthRefresh = false,
): Promise<AuthUser> {
  return apiClient.get<AuthUser>(API_ENDPOINTS.auth.me, {
    ...COOKIE_REQUEST,
    accessToken,
    skipAuthRefresh,
  });
}

export function changePassword(
  request: ChangePasswordRequest,
): Promise<unknown> {
  return apiClient.patch<unknown>(API_ENDPOINTS.auth.changePassword, request);
}
