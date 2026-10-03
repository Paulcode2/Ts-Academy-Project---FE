export type AuthRole = "ADMIN" | "MANAGER" | "STAFF";

export interface AuthUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AuthRole;
  assignedWarehouses: unknown[];
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  user?: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthenticationState {
  status: AuthStatus;
  accessToken: string | null;
  currentUser: AuthUser | null;
  role: AuthRole | null;
  assignedWarehouses: unknown[];
  sessionError: string | null;
}
