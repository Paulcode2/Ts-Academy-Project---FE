import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";
import type { PaginatedResponse } from "../../types/api";
import type {
  InventoryRecord,
  StockMovementRecord,
  TransferRecord,
} from "../../types/inventory";

export type ReportKind =
  | "inventory"
  | "warehouse-inventory"
  | "low-stock"
  | "stock-movements"
  | "transfers";

export interface ReportQuery {
  warehouse?: string;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
  location?: string;
  product?: string;
  category?: string;
  stockStatus?: string;
  movementType?: string;
  performedBy?: string;
  initiatedBy?: string;
  transferStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface WarehouseInventoryReportRow {
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  totalInventoryUnits: number;
  inventoryRecordCount: number;
  productCount: number;
  locationCount: number;
  lowStockRecordCount: number;
  outOfStockRecordCount: number;
}

export type ReportRow =
  | InventoryRecord
  | WarehouseInventoryReportRow
  | StockMovementRecord
  | TransferRecord;

const REPORT_ENDPOINTS: Record<ReportKind, string> = {
  inventory: API_ENDPOINTS.reports.inventory,
  "warehouse-inventory": API_ENDPOINTS.reports.warehouseInventory,
  "low-stock": API_ENDPOINTS.reports.lowStock,
  "stock-movements": API_ENDPOINTS.reports.stockMovements,
  transfers: API_ENDPOINTS.reports.transfers,
};

const MAX_PAGE_SIZE = 50;

export function buildReportQuery(
  kind: ReportKind,
  query: ReportQuery,
): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, query.page ?? 1)));
  params.set(
    "limit",
    String(Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20))),
  );
  params.set("sort", query.sort || defaultReportSort(kind));

  const keys: (keyof ReportQuery)[] =
    kind === "inventory" || kind === "low-stock"
      ? [
          "warehouse",
          "location",
          "product",
          "category",
          ...(kind === "inventory" ? ["stockStatus" as const] : []),
          "search",
          "startDate",
          "endDate",
        ]
      : kind === "warehouse-inventory"
        ? [
            "warehouse",
            "location",
            "product",
            "category",
            "search",
            "startDate",
            "endDate",
          ]
        : kind === "stock-movements"
          ? [
              "warehouse",
              "location",
              "product",
              "movementType",
              "performedBy",
              "search",
              "startDate",
              "endDate",
            ]
          : [
              "warehouse",
              "sourceWarehouse",
              "destinationWarehouse",
              "product",
              "transferStatus",
              "initiatedBy",
              "search",
              "startDate",
              "endDate",
            ];

  for (const key of keys) {
    const value = query[key];
    if (typeof value === "string" && value.trim()) {
      params.set(key, value.trim());
    }
  }
  return `?${params.toString()}`;
}

export function defaultReportSort(kind: ReportKind): string {
  if (kind === "inventory" || kind === "low-stock") return "-updatedAt";
  if (kind === "warehouse-inventory") return "warehouseName";
  if (kind === "stock-movements") return "-createdAt";
  return "-createdAt";
}

export const reportService = {
  list(
    kind: ReportKind,
    query: ReportQuery,
  ): Promise<PaginatedResponse<ReportRow>> {
    return apiClient.getPaginated<ReportRow>(
      `${REPORT_ENDPOINTS[kind]}${buildReportQuery(kind, query)}`,
    );
  },
};
