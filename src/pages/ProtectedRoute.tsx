import { Navigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import type { AuthRole } from "../types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AuthRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { status, role } = useAuth();

  if (status === "loading") {
    return <div role="status">Restoring session...</div>;
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
