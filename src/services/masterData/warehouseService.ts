import { API_ENDPOINTS } from "../api/apiEndpoints";
import { createResourceService } from "./resourceService";
import type { WarehouseInput, WarehouseRecord } from "../../types/masterData";

export const warehouseService = createResourceService<
  WarehouseRecord,
  WarehouseInput
>(API_ENDPOINTS.masterData.warehouses);
