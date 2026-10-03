import { apiClient } from "./api/apiClient";
import { API_ENDPOINTS } from "./api/apiEndpoints";

export function checkApiHealth<T = unknown>(): Promise<T> {
  return apiClient.get<T>(API_ENDPOINTS.health);
}
