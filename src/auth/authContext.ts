import { createContext } from "react";
import type {
  AuthenticationState,
  AuthUser,
  ChangePasswordRequest,
  LoginCredentials,
} from "../types/auth";

export interface AuthContextValue extends AuthenticationState {
  login(credentials: LoginCredentials): Promise<void>;
  logout(): Promise<void>;
  refreshCurrentUser(): Promise<AuthUser>;
  changePassword(request: ChangePasswordRequest): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
