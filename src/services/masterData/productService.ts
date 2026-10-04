import { API_ENDPOINTS } from "../api/apiEndpoints";
import { createResourceService } from "./resourceService";
import type { ProductInput, ProductRecord } from "../../types/masterData";

export const productService = createResourceService<
  ProductRecord,
  ProductInput
>(API_ENDPOINTS.masterData.products);

export const PRODUCT_UNITS = [
  "EA",
  "BOX",
  "CASE",
  "PALLET",
  "KG",
  "L",
  "SET",
  "BUNDLE",
] as const;
