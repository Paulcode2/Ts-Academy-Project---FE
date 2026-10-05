import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";

export interface DashboardEntity {
  id?: string;
  _id?: string;
  name?: string;
  sku?: string;
  code?: string;
}

export interface DashboardSummary {
  role: string;
  totals: {
    warehouses: number;
    locations: number;
    activeProducts: number;
    inventoryUnits: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    pendingTransfers: number;
  };
  recentStockMovements: Array<{
    id: string;
    movementType: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reference?: string;
    createdAt: string;
    product: DashboardEntity;
    warehouse: DashboardEntity;
    location: DashboardEntity;
  }>;
  recentTransfers: Array<{
    id: string;
    reference: string;
    quantity: number;
    status: string;
    createdAt: string;
    product: DashboardEntity;
    sourceWarehouse: DashboardEntity;
    sourceLocation: DashboardEntity;
    destinationWarehouse: DashboardEntity;
    destinationLocation: DashboardEntity;
  }>;
  inventoryByWarehouse: Array<{
    warehouse: DashboardEntity & { id: string };
    totalInventoryUnits: number;
    inventoryRecordCount: number;
  }>;
  movementTotalsByType?: Array<{
    _id: string;
    count: number;
    quantity: number;
  }>;
}

export const dashboardService = {
  getSummary(): Promise<DashboardSummary> {
    return apiClient.get<DashboardSummary>(API_ENDPOINTS.dashboard.summary);
  },
};
