export type InventoryStockStatus =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

export interface InventoryRecord {
  id: string;
  quantity: number;
  minimumStockLevel: number;
  stockStatus: InventoryStockStatus;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  category: {
    id: string;
    name: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
  };
}

export interface InventoryDetailRecord {
  id: string;
  quantity: number;
  minimumStockLevel: number;
  stockStatus: InventoryStockStatus;
  updatedAt: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    unit: string;
    category: {
      _id: string;
      name: string;
    };
  };
  warehouse: {
    _id: string;
    name: string;
    code: string;
  };
  location: {
    _id: string;
    name: string;
    code: string;
  };
}

export interface InventoryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  product?: string;
  warehouse?: string;
  location?: string;
  category?: string;
  stockStatus?: InventoryStockStatus;
  sort?: string;
}

export type StockMovementType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export interface StockMovementRecord {
  id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    unit: string;
  };
  warehouse: {
    _id: string;
    name: string;
    code: string;
  };
  location: {
    _id: string;
    name: string;
    code: string;
  };
  movementType: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference: string;
  notes: string;
  performedBy:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        email?: string;
      }
    | string;
  createdAt: string;
}

export interface StockOperationInput {
  productId: string;
  warehouseId: string;
  locationId: string;
  quantity: number;
  reason: string;
  reference?: string;
  notes?: string;
}

export interface StockAdjustmentInput {
  productId: string;
  warehouseId: string;
  locationId: string;
  newQuantity: number;
  reason: string;
  reference?: string;
  notes?: string;
}

export type StockOperationAttempt =
  | {
      kind: "stock-in";
      body: StockOperationInput;
      idempotencyKey: string;
    }
  | {
      kind: "stock-out";
      body: StockOperationInput;
      idempotencyKey: string;
    }
  | {
      kind: "adjust";
      body: StockAdjustmentInput;
      idempotencyKey: string;
    };

export interface StockOperationResult {
  inventory: {
    id: string;
    product: string;
    warehouse: string;
    location: string;
    quantity: number;
    updatedAt: string;
  };
  movement: {
    id: string;
    movementType: StockMovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    reference: string;
    performedBy: string;
    createdAt: string;
  };
  replayed?: boolean;
}

export interface StockMovementQuery {
  product?: string;
  warehouse?: string;
  location?: string;
  type?: StockMovementType;
  user?: string;
  reference?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export type TransferStatus =
  | "PENDING"
  | "APPROVED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export interface TransferParty {
  id: string;
  firstName?: string;
  lastName?: string;
}

export interface TransferRecord {
  id: string;
  reference: string;
  status: TransferStatus;
  product:
    | {
        id: string;
        name?: string;
        sku?: string;
        unit?: string;
      }
    | string;
  quantity: number;
  sourceWarehouse: { id: string; name?: string; code?: string } | string;
  sourceLocation: { id: string; name?: string; code?: string } | string;
  destinationWarehouse: { id: string; name?: string; code?: string } | string;
  destinationLocation: { id: string; name?: string; code?: string } | string;
  initiatedBy: TransferParty | string;
  approvedBy?: TransferParty | string | null;
  rejectedBy?: TransferParty | string | null;
  completedBy?: TransferParty | string | null;
  cancelledBy?: TransferParty | string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  rejectionReason?: string;
}

export interface TransferListQuery {
  status?: TransferStatus;
  product?: string;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
  initiatedBy?: string;
  reference?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CreateTransferInput {
  productId: string;
  quantity: number;
  sourceWarehouseId: string;
  sourceLocationId: string;
  destinationWarehouseId: string;
  destinationLocationId: string;
  reference?: string;
  notes?: string;
}
