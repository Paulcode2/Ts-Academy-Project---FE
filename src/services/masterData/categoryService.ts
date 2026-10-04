import { API_ENDPOINTS } from "../api/apiEndpoints";
import { createResourceService } from "./resourceService";
import type { CategoryInput, CategoryRecord } from "../../types/masterData";

export const categoryService = createResourceService<
  CategoryRecord,
  CategoryInput
>(API_ENDPOINTS.masterData.categories);
