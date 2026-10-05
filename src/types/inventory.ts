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
