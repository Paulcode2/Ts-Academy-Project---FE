import type { AuthRole } from "../types/auth";

export type Permission =
  | "dashboard:read"
  | "warehouses:read"
  | "warehouses:manage"
  | "transfers:read"
  | "transfers:request"
  | "transfers:review"
  | "transfers:cancel-own"
  | "users:manage";

const rolePermissions: Record<AuthRole, ReadonlySet<Permission>> = {
  ADMIN: new Set([
    "dashboard:read",
    "warehouses:read",
    "warehouses:manage",
    "transfers:read",
    "transfers:request",
    "transfers:review",
    "transfers:cancel-own",
    "users:manage",
  ]),
  MANAGER: new Set([
    "dashboard:read",
    "warehouses:read",
    "transfers:read",
    "transfers:request",
    "transfers:review",
  ]),
  STAFF: new Set([
    "dashboard:read",
    "warehouses:read",
    "transfers:read",
    "transfers:request",
    "transfers:cancel-own",
  ]),
};

export function hasRole(role: AuthRole | null, ...roles: AuthRole[]): boolean {
  return role !== null && roles.includes(role);
}

export function can(role: AuthRole | null, permission: Permission): boolean {
  return role !== null && rolePermissions[role].has(permission);
}

function warehouseId(warehouse: unknown): string | null {
  if (typeof warehouse === "string") {
    return warehouse;
  }
  if (typeof warehouse !== "object" || warehouse === null) {
    return null;
  }

  const record = warehouse as Record<string, unknown>;
  if (typeof record._id === "string") {
    return record._id;
  }
  return typeof record.id === "string" ? record.id : null;
}

export function canAccessWarehouse(
  role: AuthRole | null,
  assignedWarehouses: unknown[],
  targetWarehouseId: string,
): boolean {
  if (hasRole(role, "ADMIN")) {
    return true;
  }
  if (!hasRole(role, "MANAGER", "STAFF")) {
    return false;
  }
  return assignedWarehouses.some(
    (warehouse) => warehouseId(warehouse) === targetWarehouseId,
  );
}
