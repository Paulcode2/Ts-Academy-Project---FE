import type { MasterDataPageConfig } from "../../components/MasterDataPage";
import {
  categoryService,
  locationService,
  productService,
  warehouseService,
} from "../../services/masterData";
import { listActiveManagers } from "../../services/masterData/managerService";
import { LOCATION_TYPES } from "../../services/masterData/locationService";
import { PRODUCT_UNITS } from "../../services/masterData/productService";
import type {
  CategoryInput,
  CategoryRecord,
  LocationInput,
  LocationRecord,
  ProductInput,
  ProductRecord,
  WarehouseInput,
  WarehouseRecord,
} from "../../types/masterData";

export const warehousePageConfig: MasterDataPageConfig<
  WarehouseRecord,
  WarehouseInput
> = {
  title: "Warehouses",
  singular: "Warehouse",
  path: "/warehouses",
  permission: "warehouses:manage",
  service: warehouseService,
  columns: [
    { label: "Code", value: (record) => record.code },
    { label: "Name", value: (record) => record.name },
    {
      label: "Location",
      value: (record) => `${record.address.city}, ${record.address.state}`,
    },
    {
      label: "Manager",
      value: (record) => record.manager ?? "Unassigned",
    },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Code", required: true },
    { name: "address.street", label: "Street", required: true },
    { name: "address.city", label: "City", required: true },
    { name: "address.state", label: "State", required: true },
    { name: "address.postalCode", label: "Postal code", required: true },
    { name: "address.country", label: "Country", required: true },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "manager",
      label: "Manager",
      type: "select",
      loadOptions: async () => {
        const response = await listActiveManagers();
        return response.data.map((manager) => ({
          value: manager._id,
          label: `${manager.firstName} ${manager.lastName} (${manager.email})`,
        }));
      },
    },
  ],
  initialValues: {
    name: "",
    code: "",
    "address.street": "",
    "address.city": "",
    "address.state": "",
    "address.postalCode": "",
    "address.country": "",
    description: "",
    manager: "",
  },
  fromRecord: (record) => ({
    name: record.name,
    code: record.code,
    "address.street": record.address.street,
    "address.city": record.address.city,
    "address.state": record.address.state,
    "address.postalCode": record.address.postalCode,
    "address.country": record.address.country,
    description: record.description ?? "",
    manager: record.manager ?? "",
  }),
  toInput: (values) => ({
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    address: {
      street: values["address.street"].trim(),
      city: values["address.city"].trim(),
      state: values["address.state"].trim(),
      postalCode: values["address.postalCode"].trim(),
      country: values["address.country"].trim(),
    },
    description: values.description.trim(),
    manager: values.manager || null,
  }),
  sortFields: ["name", "code", "createdAt", "updatedAt"],
  defaultSort: "name",
};

const activeWarehouseOptions = async () => {
  const response = await warehouseService.list({
    page: 1,
    limit: 50,
    status: "active",
    sortBy: "name",
    sortOrder: "asc",
  });
  return response.data.map((warehouse) => ({
    value: warehouse._id,
    label: `${warehouse.name} (${warehouse.code})`,
  }));
};

const activeCategoryOptions = async () => {
  const response = await categoryService.list({
    page: 1,
    limit: 50,
    status: "active",
    sortBy: "name",
    sortOrder: "asc",
  });
  return response.data.map((category) => ({
    value: category._id,
    label: category.name,
  }));
};

export const locationPageConfig: MasterDataPageConfig<
  LocationRecord,
  LocationInput
> = {
  title: "Locations",
  singular: "Location",
  path: "/locations",
  permission: "locations:manage",
  service: locationService,
  columns: [
    { label: "Name", value: (record) => record.name },
    { label: "Code", value: (record) => record.code },
    { label: "Warehouse ID", value: (record) => record.warehouse },
    { label: "Type", value: (record) => record.type },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Code", required: true },
    {
      name: "warehouse",
      label: "Active warehouse",
      type: "select",
      required: true,
      loadOptions: activeWarehouseOptions,
    },
    {
      name: "type",
      label: "Type",
      type: "select",
      required: true,
      options: LOCATION_TYPES.map((type) => ({ value: type, label: type })),
    },
    { name: "description", label: "Description", type: "textarea" },
  ],
  filters: [
    {
      name: "warehouseId",
      label: "Warehouse",
      type: "select",
      loadOptions: activeWarehouseOptions,
    },
    {
      name: "type",
      label: "Location type",
      type: "select",
      options: LOCATION_TYPES.map((type) => ({ value: type, label: type })),
    },
  ],
  initialValues: {
    name: "",
    code: "",
    warehouse: "",
    type: "STORAGE",
    description: "",
  },
  fromRecord: (record) => ({
    name: record.name,
    code: record.code,
    warehouse: record.warehouse,
    type: record.type,
    description: record.description ?? "",
  }),
  toInput: (values) => ({
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    warehouse: values.warehouse,
    type: values.type as LocationInput["type"],
    description: values.description.trim(),
  }),
  sortFields: ["name", "code", "createdAt", "updatedAt"],
  defaultSort: "name",
};

export const categoryPageConfig: MasterDataPageConfig<
  CategoryRecord,
  CategoryInput
> = {
  title: "Categories",
  singular: "Category",
  path: "/categories",
  permission: "categories:manage",
  service: categoryService,
  columns: [
    { label: "Name", value: (record) => record.name },
    { label: "Description", value: (record) => record.description },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description", type: "textarea" },
  ],
  initialValues: { name: "", description: "" },
  fromRecord: (record) => ({
    name: record.name,
    description: record.description ?? "",
  }),
  toInput: (values) => ({
    name: values.name.trim(),
    description: values.description.trim(),
  }),
  sortFields: ["name", "createdAt", "updatedAt"],
  defaultSort: "name",
};

export const productPageConfig: MasterDataPageConfig<
  ProductRecord,
  ProductInput
> = {
  title: "Products",
  singular: "Product",
  path: "/products",
  permission: "products:manage",
  service: productService,
  columns: [
    { label: "Name", value: (record) => record.name },
    { label: "SKU", value: (record) => record.sku },
    { label: "Category ID", value: (record) => record.category },
    { label: "Unit", value: (record) => record.unit },
    {
      label: "Minimum stock",
      value: (record) => String(record.minimumStockLevel),
    },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "sku", label: "SKU", required: true },
    {
      name: "category",
      label: "Active category",
      type: "select",
      required: true,
      loadOptions: activeCategoryOptions,
    },
    {
      name: "unit",
      label: "Unit",
      type: "select",
      required: true,
      options: PRODUCT_UNITS.map((unit) => ({ value: unit, label: unit })),
    },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "minimumStockLevel",
      label: "Minimum stock level",
      type: "number",
      min: 0,
      required: true,
    },
  ],
  filters: [
    {
      name: "category",
      label: "Category",
      type: "select",
      loadOptions: activeCategoryOptions,
    },
    {
      name: "unit",
      label: "Unit",
      type: "select",
      options: PRODUCT_UNITS.map((unit) => ({ value: unit, label: unit })),
    },
  ],
  initialValues: {
    name: "",
    sku: "",
    category: "",
    unit: "EA",
    description: "",
    minimumStockLevel: "0",
  },
  fromRecord: (record) => ({
    name: record.name,
    sku: record.sku,
    category: record.category,
    unit: record.unit,
    description: record.description ?? "",
    minimumStockLevel: String(record.minimumStockLevel),
  }),
  toInput: (values) => ({
    name: values.name.trim(),
    sku: values.sku.trim().toUpperCase(),
    category: values.category,
    unit: values.unit as ProductInput["unit"],
    description: values.description.trim(),
    minimumStockLevel: Number(values.minimumStockLevel),
  }),
  sortFields: ["name", "sku", "createdAt", "updatedAt", "minimumStockLevel"],
  defaultSort: "name",
};
