import type { ApiSuccessResponse, PaginatedResponse } from "../../types/api";
import type {
  StockAdjustmentInput,
  StockMovementQuery,
  StockMovementRecord,
  StockOperationInput,
  StockOperationResult,
} from "../../types/inventory";
import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";

const MAX_PAGE_SIZE = 50;

function buildMovementQuery(query: StockMovementQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, query.page ?? 1)));
  params.set(
    "limit",
    String(Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20))),
  );

  for (const key of [
    "product",
    "warehouse",
    "location",
    "type",
    "user",
    "reference",
    "startDate",
    "endDate",
    "sort",
  ] as const) {
    const value = query[key];
    if (value) params.set(key, value);
  }
  return `?${params.toString()}`;
}

export const stockMovementService = {
  list(
    query: StockMovementQuery,
  ): Promise<PaginatedResponse<StockMovementRecord>> {
    return apiClient.getPaginated<StockMovementRecord>(
      `${API_ENDPOINTS.stockMovements.list}${buildMovementQuery(query)}`,
    );
  },

  get(id: string): Promise<StockMovementRecord> {
    return apiClient.get<StockMovementRecord>(
      `${API_ENDPOINTS.stockMovements.list}/${encodeURIComponent(id)}`,
    );
  },

  stockIn(
    input: StockOperationInput,
    idempotencyKey: string,
  ): Promise<ApiSuccessResponse<StockOperationResult>> {
    return apiClient.post(
      API_ENDPOINTS.stockMovements.stockIn,
      input,
      {
        headers: { "Idempotency-Key": idempotencyKey },
        preserveResponse: true,
      },
    );
  },

  stockOut(
    input: StockOperationInput,
    idempotencyKey: string,
  ): Promise<ApiSuccessResponse<StockOperationResult>> {
    return apiClient.post(
      API_ENDPOINTS.stockMovements.stockOut,
      input,
      {
        headers: { "Idempotency-Key": idempotencyKey },
        preserveResponse: true,
      },
    );
  },

  adjust(
    input: StockAdjustmentInput,
    idempotencyKey: string,
  ): Promise<ApiSuccessResponse<StockOperationResult>> {
    return apiClient.post(
      API_ENDPOINTS.stockMovements.adjust,
      input,
      {
        headers: { "Idempotency-Key": idempotencyKey },
        preserveResponse: true,
      },
    );
  },
};
