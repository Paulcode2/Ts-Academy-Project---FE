import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";
import type { PaginatedResponse } from "../../types/api";
import type {
  CreateTransferInput,
  TransferListQuery,
  TransferRecord,
  TransferStatus,
} from "../../types/inventory";

const MAX_PAGE_SIZE = 50;

function buildQuery(query: TransferListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, query.page ?? 1)));
  params.set(
    "limit",
    String(Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? 20))),
  );
  for (const key of [
    "status",
    "product",
    "sourceWarehouse",
    "destinationWarehouse",
    "initiatedBy",
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

export const transferService = {
  list(query: TransferListQuery): Promise<PaginatedResponse<TransferRecord>> {
    return apiClient.getPaginated<TransferRecord>(
      `${API_ENDPOINTS.transfers.list}${buildQuery(query)}`,
    );
  },

  get(id: string): Promise<TransferRecord> {
    return apiClient.get<TransferRecord>(
      `${API_ENDPOINTS.transfers.list}/${encodeURIComponent(id)}`,
    );
  },

  create(input: CreateTransferInput): Promise<TransferRecord> {
    return apiClient.post<TransferRecord>(
      API_ENDPOINTS.transfers.list,
      input,
    );
  },

  approve(id: string): Promise<TransferRecord> {
    return apiClient.patch<TransferRecord>(
      `${API_ENDPOINTS.transfers.list}/${encodeURIComponent(id)}/approve`,
    );
  },

  reject(id: string, rejectionReason: string): Promise<TransferRecord> {
    return apiClient.patch<TransferRecord>(
      `${API_ENDPOINTS.transfers.list}/${encodeURIComponent(id)}/reject`,
      { rejectionReason },
    );
  },

  cancel(id: string): Promise<TransferRecord> {
    return apiClient.patch<TransferRecord>(
      `${API_ENDPOINTS.transfers.list}/${encodeURIComponent(id)}/cancel`,
    );
  },

  complete(id: string): Promise<TransferRecord> {
    return apiClient.patch<TransferRecord>(
      `${API_ENDPOINTS.transfers.list}/${encodeURIComponent(id)}/complete`,
    );
  },
};

export function isTransferStatus(value: string | null): value is TransferStatus {
  return (
    value === "PENDING" ||
    value === "APPROVED" ||
    value === "COMPLETED" ||
    value === "REJECTED" ||
    value === "CANCELLED"
  );
}
