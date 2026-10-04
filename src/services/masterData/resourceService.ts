import { apiClient } from "../api/apiClient";
import type { PaginatedResponse } from "../../types/api";
import type { MasterDataListQuery } from "../../types/masterData";

type QueryValue = string | number | boolean | undefined;

export interface ResourceService<TRecord extends { _id: string }, TInput> {
  list(query?: MasterDataListQuery): Promise<PaginatedResponse<TRecord>>;
  get(id: string): Promise<TRecord>;
  create(input: TInput): Promise<TRecord>;
  update(id: string, input: Partial<TInput>): Promise<TRecord>;
  setStatus(id: string, isActive: boolean): Promise<TRecord>;
}

export function buildQueryString(query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function createResourceService<TRecord extends { _id: string }, TInput>(
  path: string,
) {
  return {
    list(query: MasterDataListQuery & Record<string, QueryValue> = {}) {
      const boundedQuery = {
        ...query,
        page: Math.max(1, query.page ?? 1),
        limit: Math.min(50, Math.max(1, query.limit ?? 20)),
      };
      return apiClient.getPaginated<TRecord>(
        `${path}${buildQueryString(boundedQuery)}`,
      );
    },
    get(id: string): Promise<TRecord> {
      return apiClient.get<TRecord>(`${path}/${encodeURIComponent(id)}`);
    },
    create(input: TInput): Promise<TRecord> {
      return apiClient.post<TRecord>(path, input);
    },
    update(id: string, input: Partial<TInput>): Promise<TRecord> {
      return apiClient.patch<TRecord>(
        `${path}/${encodeURIComponent(id)}`,
        input,
      );
    },
    setStatus(id: string, isActive: boolean): Promise<TRecord> {
      return apiClient.patch<TRecord>(
        `${path}/${encodeURIComponent(id)}/status`,
        { isActive },
      );
    },
  };
}

export type { PaginatedResponse };
