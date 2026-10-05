import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";
import type { PaginatedResponse } from "../../types/api";
import type {
  InventoryListQuery,
  InventoryDetailRecord,
  InventoryRecord,
  InventoryStockStatus,
} from "../../types/inventory";

export type InventoryListView = "all" | "low-stock" | "out-of-stock";
export const STOCK_DATA_UPDATED_EVENT = "stock-data-updated";

const MAX_PAGE_SIZE = 50;

function buildInventoryQuery(query: InventoryListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, query.page ?? 1)));
  params.set(
    "limit",
    String(Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20))),
  );

  for (const key of [
    "search",
    "product",
    "warehouse",
    "location",
    "category",
    "stockStatus",
    "sort",
  ] as const) {
    const value = query[key];
    if (value) params.set(key, value);
  }

  return `?${params.toString()}`;
}

export const inventoryService = {
  list(
    query: InventoryListQuery,
    view: InventoryListView = "all",
  ): Promise<PaginatedResponse<InventoryRecord>> {
    const endpoint =
      view === "low-stock"
        ? API_ENDPOINTS.inventory.lowStock
        : view === "out-of-stock"
          ? API_ENDPOINTS.inventory.outOfStock
          : API_ENDPOINTS.inventory.list;
    const listQuery =
      view === "all" ? query : { ...query, stockStatus: undefined };
    return apiClient.getPaginated<InventoryRecord>(
      `${endpoint}${buildInventoryQuery(listQuery)}`,
    );
  },

  get(id: string): Promise<InventoryDetailRecord> {
    return apiClient.get<InventoryDetailRecord>(
      `${API_ENDPOINTS.inventory.list}/${encodeURIComponent(id)}`,
    );
  },
};

export function isInventoryStockStatus(
  value: string | null,
): value is InventoryStockStatus {
  return (
    value === "IN_STOCK" ||
    value === "LOW_STOCK" ||
    value === "OUT_OF_STOCK"
  );
}
