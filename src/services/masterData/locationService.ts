import { API_ENDPOINTS } from "../api/apiEndpoints";
import { createResourceService } from "./resourceService";
import type { LocationInput, LocationRecord } from "../../types/masterData";

export const locationService = createResourceService<
  LocationRecord,
  LocationInput
>(API_ENDPOINTS.masterData.locations);

export const LOCATION_TYPES = [
  "STORAGE",
  "PICKING",
  "RECEIVING",
  "QUARANTINE",
  "RETURN",
  "COLD_STORAGE",
] as const;
