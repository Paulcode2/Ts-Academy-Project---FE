export type RecordStatus = "active" | "inactive" | "all";
export type SortOrder = "asc" | "desc";

export interface MasterDataListQuery extends Record<
  string,
  string | number | boolean | undefined
> {
  page?: number;
  limit?: number;
  search?: string;
  status?: RecordStatus;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface WarehouseAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface WarehouseRecord {
  _id: string;
  name: string;
  code: string;
  address: WarehouseAddress;
  description: string;
  manager: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInput {
  name: string;
  code: string;
  address: WarehouseAddress;
  description?: string;
  manager?: string | null;
}

export type LocationType =
  | "STORAGE"
  | "PICKING"
  | "RECEIVING"
  | "QUARANTINE"
  | "RETURN"
  | "COLD_STORAGE";

export interface LocationRecord {
  _id: string;
  name: string;
  code: string;
  warehouse: string;
  type: LocationType;
  description: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationInput {
  name: string;
  code: string;
  warehouse: string;
  type: LocationType;
  description?: string;
}

export interface CategoryRecord {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
}

export type ProductUnit =
  | "EA"
  | "BOX"
  | "CASE"
  | "PALLET"
  | "KG"
  | "L"
  | "SET"
  | "BUNDLE";

export interface ProductRecord {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: ProductUnit;
  description: string;
  minimumStockLevel: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku: string;
  category: string;
  unit: ProductUnit;
  description?: string;
  minimumStockLevel: number;
}

export interface ManagerOption {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "MANAGER";
  isActive: boolean;
}
