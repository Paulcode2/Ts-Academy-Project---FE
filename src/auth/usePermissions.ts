import { useAuth } from "./useAuth";
import type { AuthRole } from "../types/auth";
import {
  can,
  canAccessWarehouse,
  hasRole,
  type Permission,
} from "./permissions";

export function usePermissions() {
  const { role, assignedWarehouses } = useAuth();

  return {
    role,
    assignedWarehouses,
    isAdmin: hasRole(role, "ADMIN"),
    isManager: hasRole(role, "MANAGER"),
    isStaff: hasRole(role, "STAFF"),
    hasRole: (...roles: AuthRole[]) => hasRole(role, ...roles),
    can: (permission: Permission) => can(role, permission),
    canAccessWarehouse: (warehouseId: string) =>
      canAccessWarehouse(role, assignedWarehouses, warehouseId),
  };
}
