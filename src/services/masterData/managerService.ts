import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";
import { buildQueryString } from "./resourceService";
import type { PaginatedResponse } from "../../types/api";
import type { ManagerOption } from "../../types/masterData";

export function listActiveManagers(): Promise<
  PaginatedResponse<ManagerOption>
> {
  return apiClient.getPaginated<ManagerOption>(
    `${API_ENDPOINTS.users.list}${buildQueryString({
      role: "MANAGER",
      isActive: true,
      page: 1,
      limit: 50,
    })}`,
  );
}
