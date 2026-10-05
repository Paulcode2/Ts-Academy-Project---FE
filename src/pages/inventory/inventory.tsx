import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { ApiError } from "../../services/api/apiClient";
import { categoryService } from "../../services/masterData/categoryService";
import { locationService } from "../../services/masterData/locationService";
import { productService } from "../../services/masterData/productService";
import { warehouseService } from "../../services/masterData/warehouseService";
import {
  inventoryService,
  isInventoryStockStatus,
  STOCK_DATA_UPDATED_EVENT,
  type InventoryListView,
} from "../../services/inventory/inventoryService";
import type { Pagination } from "../../types/api";
import type {
  InventoryListQuery,
  InventoryDetailRecord,
  InventoryRecord,
  InventoryStockStatus,
} from "../../types/inventory";
import AppNavigation from "../../components/AppNavigation";
import "../../pages/Warehouses/warehouse.css";
import "../../components/masterDataPage.css";
import "./inventory.css";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  products: FilterOption[];
  warehouses: FilterOption[];
  locations: FilterOption[];
  categories: FilterOption[];
}

const INITIAL_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "The request could not be completed. Please try again.";
  }
  if (error.status === 401) {
    return "Your session has expired. Sign in again to view inventory.";
  }
  if (error.status === 403) {
    return "You do not have permission to view this inventory.";
  }
  if (error.status === 404) {
    return "This inventory record no longer exists or is not available to you.";
  }
  if (error.status === 400) {
    return `The inventory request was invalid: ${error.message}`;
  }
  if (error.status === 409) {
    return `The inventory request conflicts with the current state: ${error.message}`;
  }
  if (error.status === 500) {
    return "The server could not complete the request. Try again shortly.";
  }
  if (error.status === 503) {
    return "The inventory service is temporarily unavailable. Try again shortly.";
  }
  if (error.status === null) {
    return "The API could not be reached. Check the network connection.";
  }
  return error.message;
}

function listView(pathname: string): InventoryListView {
  if (pathname.endsWith("/low-stock")) return "low-stock";
  if (pathname.endsWith("/out-of-stock")) return "out-of-stock";
  return "all";
}

function viewStockStatus(view: InventoryListView): InventoryStockStatus | null {
  if (view === "low-stock") return "LOW_STOCK";
  if (view === "out-of-stock") return "OUT_OF_STOCK";
  return null;
}

function boundedPage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function boundedLimit(value: string | null): number {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1) return 20;
  return Math.min(50, limit);
}

function getInventoryQuery(params: URLSearchParams): InventoryListQuery {
  const query: InventoryListQuery = {
    page: boundedPage(params.get("page")),
    limit: boundedLimit(params.get("limit")),
  };
  const search = params.get("search")?.trim();
  const product = params.get("product");
  const warehouse = params.get("warehouse");
  const location = params.get("location");
  const category = params.get("category");
  const sort = params.get("sort");
  const stockStatus = params.get("stockStatus");

  if (search) query.search = search;
  if (product) query.product = product;
  if (warehouse) query.warehouse = warehouse;
  if (location) query.location = location;
  if (category) query.category = category;
  query.sort = sort ?? "-updatedAt";
  if (isInventoryStockStatus(stockStatus)) query.stockStatus = stockStatus;
  return query;
}

function recordUpdatedAt(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

function inventoryStatusClass(status: InventoryStockStatus): string {
  if (status === "LOW_STOCK") return "pill-warn";
  if (status === "OUT_OF_STOCK") return "pill-danger";
  return "pill-ok";
}

function inventoryStatusLabel(status: InventoryStockStatus): string {
  if (status === "LOW_STOCK") return "Low Stock";
  if (status === "OUT_OF_STOCK") return "Out of Stock";
  return "In Stock";
}

function createTabSearch(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("stockStatus");
  params.set("page", "1");
  return params.toString() ? `?${params.toString()}` : "";
}

function InventorySearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [searchText, setSearchText] = useState(initialSearch);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentSearch = searchParams.get("search") ?? "";
      if (currentSearch === searchText.trim()) return;

      const updated = new URLSearchParams(searchParams);
      if (searchText.trim()) updated.set("search", searchText.trim());
      else updated.delete("search");
      updated.set("page", "1");
      setSearchParams(updated);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchParams, searchText, setSearchParams]);

  return (
    <input
      aria-label="Search inventory"
      placeholder="Search product or SKU"
      value={searchText}
      onChange={(event) => setSearchText(event.target.value)}
    />
  );
}

export default function Inventory() {
  const { inventoryId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const currentParams = useMemo(
    () => new URLSearchParams(searchString),
    [searchString],
  );
  const query = useMemo(
    () => getInventoryQuery(currentParams),
    [currentParams],
  );
  const view = listView(location.pathname);
  const fixedStockStatus = viewStockStatus(view);
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detailRecord, setDetailRecord] = useState<InventoryDetailRecord | null>(
    null,
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    products: [],
    warehouses: [],
    locations: [],
    categories: [],
  });
  const [filterOptionsError, setFilterOptionsError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (inventoryId) return;
    let current = true;
    const request = Promise.resolve().then(() => {
      if (!current) return null;
      setIsLoading(true);
      setListError("");
      return inventoryService.list(query, view);
    });
    void request
      .then((response) => {
        if (!response || !current) return;
        const totalPages = response.pagination.totalPages;
        if (query.page && query.page > Math.max(1, totalPages)) {
          const corrected = new URLSearchParams(searchString);
          corrected.set("page", String(Math.max(1, totalPages)));
          setSearchParams(corrected);
          return;
        }
        setRecords(response.data);
        setPagination(response.pagination);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setRecords([]);
        setListError(errorMessage(error));
      })
      .finally(() => {
        if (current) setIsLoading(false);
      });
    const refresh = () => setRetryCount((count) => count + 1);
    window.addEventListener(STOCK_DATA_UPDATED_EVENT, refresh);
    return () => {
      current = false;
      window.removeEventListener(STOCK_DATA_UPDATED_EVENT, refresh);
    };
  }, [inventoryId, query, retryCount, searchString, setSearchParams, view]);

  useEffect(() => {
    if (!inventoryId) return;
    let current = true;
    const request = Promise.resolve().then(() => {
      if (!current) return null;
      setIsLoadingDetail(true);
      setDetailError("");
      setDetailRecord(null);
      return inventoryService.get(inventoryId);
    });
    void request
      .then((record) => {
        if (current && record) setDetailRecord(record);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setDetailRecord(null);
        setDetailError(errorMessage(error));
      })
      .finally(() => {
        if (current) setIsLoadingDetail(false);
      });
    const refresh = () => setRetryCount((count) => count + 1);
    window.addEventListener(STOCK_DATA_UPDATED_EVENT, refresh);
    return () => {
      current = false;
      window.removeEventListener(STOCK_DATA_UPDATED_EVENT, refresh);
    };
  }, [inventoryId, retryCount]);

  useEffect(() => {
    if (inventoryId) return;
    let current = true;
    const warehouseFilter = query.warehouse;
    const request = Promise.resolve().then(() => {
      if (!current) return null;
      return Promise.all([
        productService.list({
          page: 1,
          limit: 50,
          status: "active",
          sortBy: "name",
          sortOrder: "asc",
        }),
        warehouseService.list({
          page: 1,
          limit: 50,
          status: "active",
          sortBy: "name",
          sortOrder: "asc",
        }),
        locationService.list({
          page: 1,
          limit: 50,
          status: "active",
          ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}),
          sortBy: "name",
          sortOrder: "asc",
        }),
        categoryService.list({
          page: 1,
          limit: 50,
          status: "active",
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);
    });
    void request
      .then((results) => {
        if (!current || !results) return;
        const [products, warehouses, locations, categories] = results;
        setFilterOptionsError("");
        setFilterOptions({
          products: products.data.map((product) => ({
            value: product._id,
            label: `${product.name} (${product.sku})`,
          })),
          warehouses: warehouses.data.map((warehouse) => ({
            value: warehouse._id,
            label: `${warehouse.name} (${warehouse.code})`,
          })),
          locations: locations.data.map((item) => ({
            value: item._id,
            label: `${item.name} (${item.code})`,
          })),
          categories: categories.data.map((category) => ({
            value: category._id,
            label: category.name,
          })),
        });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setFilterOptionsError(errorMessage(error));
      });
    return () => {
      current = false;
    };
  }, [inventoryId, query.warehouse, retryCount]);

  function updateFilter(
    key: keyof InventoryListQuery,
    value: string | number | undefined,
  ) {
    const updated = new URLSearchParams(searchString);
    if (value === undefined || value === "") {
      updated.delete(key);
    } else {
      updated.set(key, String(value));
    }
    if (key !== "page") updated.set("page", "1");
    setSearchParams(updated);
  }

  function pageSearch(path: string) {
    return `${path}${createTabSearch(location.search)}`;
  }

  const totalPages = Math.max(1, pagination.totalPages);
  const pageSize = Math.min(50, Math.max(1, query.limit ?? 20));
  const detailReturn = (location.state as { from?: unknown } | null)?.from;
  const backPath =
    typeof detailReturn === "string"
      ? detailReturn
      : `/inventory${location.search}`;

  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/inventory" showBrand={false} />
      <main className="main-content">
        <div className="topbar">
          <h1>{inventoryId ? "Inventory details" : "Inventory"}</h1>
        </div>

        <nav className="inventory-tabs" aria-label="Inventory views">
          <Link
            to={pageSearch("/inventory")}
            aria-current={view === "all" ? "page" : undefined}
          >
            All inventory
          </Link>
          <Link
            to={pageSearch("/inventory/low-stock")}
            aria-current={view === "low-stock" ? "page" : undefined}
          >
            Low stock
          </Link>
          <Link
            to={pageSearch("/inventory/out-of-stock")}
            aria-current={view === "out-of-stock" ? "page" : undefined}
          >
            Out of stock
          </Link>
        </nav>

        {inventoryId ? (
          <>
            <p>
              <Link to={backPath}>Back to inventory</Link>
            </p>
            {isLoadingDetail ||
            (!detailError && detailRecord?.id !== inventoryId) ? (
              <p role="status">Loading inventory details...</p>
            ) : detailError ? (
              <p className="master-data-error" role="alert">
                {detailError}
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  Retry
                </button>
              </p>
            ) : detailRecord ? (
              <dl className="master-data-details inventory-details">
                <div>
                  <dt>Product</dt>
                  <dd>{detailRecord.product.name}</dd>
                </div>
                <div>
                  <dt>SKU</dt>
                  <dd>{detailRecord.product.sku}</dd>
        </div>
        <div>
                  <dt>Product ID</dt>
                  <dd>{detailRecord.product._id}</dd>
                </div>
                <div>
                  <dt>Unit</dt>
                  <dd>{detailRecord.product.unit}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{detailRecord.product.category.name}</dd>
                </div>
                <div>
                  <dt>Warehouse</dt>
                  <dd>
                    {detailRecord.warehouse.name} (
                    {detailRecord.warehouse.code})
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {detailRecord.location.name} ({detailRecord.location.code})
                  </dd>
                </div>
                <div>
                  <dt>Quantity</dt>
                  <dd>{detailRecord.quantity}</dd>
                </div>
                <div>
                  <dt>Minimum stock</dt>
                  <dd>{detailRecord.minimumStockLevel}</dd>
                </div>
                <div>
                  <dt>Stock status</dt>
                  <dd>
                    <span
                      className={`pill ${inventoryStatusClass(detailRecord.stockStatus)}`}
                    >
                      {inventoryStatusLabel(detailRecord.stockStatus)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{recordUpdatedAt(detailRecord.updatedAt)}</dd>
                </div>
              </dl>
            ) : null}
          </>
        ) : (
          <>
            <div className="master-data-filters inventory-filters">
              <InventorySearch key={`${view}:${query.search ?? ""}`} />
              <select
                aria-label="Product"
                value={query.product ?? ""}
                onChange={(event) =>
                  updateFilter("product", event.target.value || undefined)
                }
              >
                <option value="">All products</option>
                {filterOptions.products.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Warehouse"
                value={query.warehouse ?? ""}
                onChange={(event) => {
                  const updated = new URLSearchParams(searchString);
                  const warehouse = event.target.value;
                  if (warehouse) updated.set("warehouse", warehouse);
                  else updated.delete("warehouse");
                  updated.delete("location");
                  updated.set("page", "1");
                  setFilterOptions((current) => ({
                    ...current,
                    locations: [],
                  }));
                  setSearchParams(updated);
                }}
              >
                <option value="">All warehouses</option>
                {filterOptions.warehouses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Location"
                value={query.location ?? ""}
                onChange={(event) =>
                  updateFilter("location", event.target.value || undefined)
                }
              >
                <option value="">All locations</option>
                {filterOptions.locations.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Category"
                value={query.category ?? ""}
                onChange={(event) =>
                  updateFilter("category", event.target.value || undefined)
                }
              >
                <option value="">All categories</option>
                {filterOptions.categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Stock status"
                value={fixedStockStatus ?? query.stockStatus ?? ""}
                disabled={fixedStockStatus !== null}
                onChange={(event) =>
                  updateFilter(
                    "stockStatus",
                    event.target.value || undefined,
                  )
                }
              >
                <option value="">All stock statuses</option>
                <option value="IN_STOCK">IN_STOCK</option>
                <option value="LOW_STOCK">LOW_STOCK</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
              </select>
              <select
                aria-label="Sort inventory"
                value={query.sort ?? "-updatedAt"}
                onChange={(event) =>
                  updateFilter("sort", event.target.value || undefined)
                }
              >
                <option value="-updatedAt">Recently updated</option>
                <option value="updatedAt">Least recently updated</option>
                <option value="quantity">Quantity (low to high)</option>
                <option value="-quantity">Quantity (high to low)</option>
                <option value="productName">Product (A to Z)</option>
                <option value="-productName">Product (Z to A)</option>
                <option value="sku">SKU (A to Z)</option>
                <option value="-sku">SKU (Z to A)</option>
              </select>
              <select
                aria-label="Page size"
                value={pageSize}
                onChange={(event) =>
                  updateFilter("limit", Number(event.target.value))
                }
              >
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            {filterOptionsError && (
              <p className="master-data-error" role="alert">
                Could not load inventory filter options: {filterOptionsError}
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  Retry
                </button>
              </p>
            )}
            {listError && (
              <p className="master-data-error" role="alert">
                {listError}
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  Retry
                </button>
              </p>
            )}
            {isLoading ? (
              <p role="status">Loading inventory...</p>
            ) : listError ? null : records.length === 0 ? (
              <div className="inventory-empty-state" role="status">
                <p>
                  {query.search ||
                  query.product ||
                  query.warehouse ||
                  query.location ||
                  query.category ||
                  (view === "all" && query.stockStatus)
                    ? "No inventory matches your current filters."
                    : view === "low-stock"
                      ? "No low-stock inventory."
                      : view === "out-of-stock"
                        ? "No out-of-stock inventory."
                        : "No inventory records found."}
                </p>
                {(query.search ||
                  query.product ||
                  query.warehouse ||
                  query.location ||
                  query.category ||
                  query.stockStatus) && (
                  <>
                    <p>Clear your filters to see more inventory.</p>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = new URLSearchParams();
                        updated.set("page", "1");
                        updated.set("limit", String(pageSize));
                        if (query.sort) updated.set("sort", query.sort);
                        setSearchParams(updated);
                      }}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="inventory-table-wrap">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Unit</th>
                      <th>Category</th>
                      <th>Warehouse</th>
                      <th>Location</th>
                      <th>Quantity</th>
                      <th>Minimum stock</th>
                      <th>Stock status</th>
                      <th>Updated</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.product.name}</td>
                        <td>{record.product.sku}</td>
                        <td>{record.product.unit}</td>
                        <td>{record.category.name}</td>
                        <td>
                          {record.warehouse.name} ({record.warehouse.code})
                        </td>
                        <td>
                          {record.location.name} ({record.location.code})
                        </td>
                        <td>{record.quantity}</td>
                        <td>{record.minimumStockLevel}</td>
                        <td>
                          <span
                            className={`pill ${inventoryStatusClass(record.stockStatus)}`}
                          >
                          {inventoryStatusLabel(record.stockStatus)}
                          </span>
                        </td>
                        <td>{recordUpdatedAt(record.updatedAt)}</td>
                        <td>
                          <Link
                            to={`/inventory/${encodeURIComponent(record.id)}${location.search}`}
                            state={{
                              from: `${location.pathname}${location.search}`,
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="master-data-pagination">
              <span>
                Page {pagination.page} of {totalPages} ({pagination.totalItems}{" "}
                total)
              </span>
              <button
                type="button"
                onClick={() =>
                  updateFilter("page", Math.max(1, pagination.page - 1))
                }
                disabled={isLoading || pagination.page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  updateFilter(
                    "page",
                    Math.min(totalPages, pagination.page + 1),
                  )
                }
                disabled={isLoading || pagination.page >= totalPages}
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => updateFilter("page", totalPages)}
                disabled={
                  isLoading ||
                  Boolean(listError) ||
                  pagination.page >= totalPages
                }
              >
                Last
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
