import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { AuthContext, type AuthContextValue } from "./authContext";
import { ApiError, configureApiAuth } from "../services/api/apiClient";
import {
  changePassword as changePasswordRequest,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from "../services/authService";
import type {
  AuthenticationState,
  AuthUser,
  ChangePasswordRequest,
  LoginCredentials,
} from "../types/auth";

const unauthenticatedState: AuthenticationState = {
  status: "unauthenticated",
  accessToken: null,
  currentUser: null,
  role: null,
  assignedWarehouses: [],
  sessionError: null,
};

function saveSession(
  accessToken: string,
  user: AuthUser,
  tokenRef: { current: string | null },
  sessionVersionRef: { current: number },
  setAuthState: React.Dispatch<React.SetStateAction<AuthenticationState>>,
  isNewSession = false,
): void {
  if (!accessToken) {
    throw new ApiError("The authentication response was incomplete.", null);
  }
  if (!user.isActive) {
    throw new ApiError("This account is inactive.", 403);
  }

  if (isNewSession) {
    sessionVersionRef.current += 1;
  }
  tokenRef.current = accessToken;
  setAuthState({
    status: "authenticated",
    accessToken,
    currentUser: user,
    role: user.role,
    assignedWarehouses: user.assignedWarehouses,
    sessionError: null,
  });
}

function clearSession(
  tokenRef: { current: string | null },
  sessionVersionRef: { current: number },
  setAuthState: React.Dispatch<React.SetStateAction<AuthenticationState>>,
): void {
  if (tokenRef.current !== null) {
    sessionVersionRef.current += 1;
  }
  tokenRef.current = null;
  setAuthState(unauthenticatedState);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const tokenRef = useRef<string | null>(null);
  const sessionVersionRef = useRef(0);
  const restoreStarted = useRef(false);
  const [authState, setAuthState] = useState<AuthenticationState>({
    ...unauthenticatedState,
    status: "loading",
  });

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => tokenRef.current ?? undefined,
      getSessionVersion: () => sessionVersionRef.current,
      refreshAccessToken: async () => {
        const response = await refreshSession();
        const user = await getCurrentUser(response.accessToken, true);
        saveSession(
          response.accessToken,
          user,
          tokenRef,
          sessionVersionRef,
          setAuthState,
        );
        return response.accessToken;
      },
      onSessionExpired: () =>
        clearSession(tokenRef, sessionVersionRef, setAuthState),
    });

    if (restoreStarted.current) {
      return;
    }
    restoreStarted.current = true;

    void (async () => {
      try {
        const response = await refreshSession();
        const user = await getCurrentUser(response.accessToken, true);
        saveSession(
          response.accessToken,
          user,
          tokenRef,
          sessionVersionRef,
          setAuthState,
          true,
        );
      } catch (error) {
        clearSession(tokenRef, sessionVersionRef, setAuthState);
        if (error instanceof ApiError && error.status === null) {
          setAuthState({
            ...unauthenticatedState,
            sessionError:
              "The API could not be reached. Check the network or browser CORS access.",
          });
        } else if (error instanceof ApiError && error.status === 503) {
          setAuthState({
            ...unauthenticatedState,
            sessionError:
              "The authentication service is temporarily unavailable.",
          });
        }
      }
    })();
  }, []);

  async function login(credentials: LoginCredentials): Promise<void> {
    const response = await loginRequest(credentials);
    saveSession(
      response.accessToken,
      response.user,
      tokenRef,
      sessionVersionRef,
      setAuthState,
      true,
    );
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest();
    } finally {
      clearSession(tokenRef, sessionVersionRef, setAuthState);
      navigate("/login", { replace: true });
    }
  }

  async function refreshCurrentUser(): Promise<AuthUser> {
    const user = await getCurrentUser();
    if (!user.isActive) {
      clearSession(tokenRef, sessionVersionRef, setAuthState);
      throw new ApiError("This account is inactive.", 403);
    }
    setAuthState((current) => ({
      ...current,
      currentUser: user,
      role: user.role,
      assignedWarehouses: user.assignedWarehouses,
    }));
    return user;
  }

  async function updatePassword(request: ChangePasswordRequest): Promise<void> {
    await changePasswordRequest(request);
  }

  const value: AuthContextValue = {
    ...authState,
    login,
    logout,
    refreshCurrentUser,
    changePassword: updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
