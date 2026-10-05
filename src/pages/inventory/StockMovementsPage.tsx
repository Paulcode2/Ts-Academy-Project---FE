import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import AppNavigation from "../../components/AppNavigation";
import { ApiError } from "../../services/api/apiClient";
import { locationService } from "../../services/masterData/locationService";
import { productService } from "../../services/masterData/productService";
import { warehouseService } from "../../services/masterData/warehouseService";
import { stockMovementService } from "../../services/inventory/stockMovementService";
import { STOCK_DATA_UPDATED_EVENT } from "../../services/inventory/inventoryService";
import type { Pagination } from "../../types/api";
import type {
  StockMovementQuery,
  StockMovementRecord,
  StockMovementType,
} from "../../types/inventory";
import type { LocationRecord, ProductRecord, WarehouseRecord } from "../../types/masterData";
import "../Warehouses/warehouse.css";
import "../../components/masterDataPage.css";
import "./inventory.css";

const MOVEMENT_TYPES: StockMovementType[] = [
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
];

const INITIAL_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "The request could not be completed. Please try again.";
  }
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 403) return "You do not have permission to view this movement.";
  if (error.status === 404) return "This stock movement no longer exists or is not available to you.";
  if (error.status === 503) return "The movement service is temporarily unavailable.";
  if (error.status === 500) return "The server could not complete the request.";
  if (error.status === null) return "The API could not be reached. Check the network connection.";
  return error.message;
}

function positivePage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function pageLimit(value: string | null): number {
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0
    ? Math.min(50, limit)
    : 20;
}

function isMovementType(value: string): value is StockMovementType {
  return MOVEMENT_TYPES.includes(value as StockMovementType);
}

function movementQuery(params: URLSearchParams): StockMovementQuery {
  const query: StockMovementQuery = {
    page: positivePage(params.get("page")),
    limit: pageLimit(params.get("limit")),
    sort: params.get("sort") || "-createdAt",
  };
  for (const key of [
    "product",
    "warehouse",
    "location",
    "type",
    "user",
    "reference",
    "startDate",
    "endDate",
  ] as const) {
    const value = params.get(key)?.trim();
    if (!value) continue;
    if (key === "type") {
      if (isMovementType(value)) query.type = value;
    } else if (key === "product") query.product = value;
    else if (key === "warehouse") query.warehouse = value;
    else if (key === "location") query.location = value;
    else if (key === "user") query.user = value;
    else if (key === "reference") query.reference = value;
    else if (key === "startDate") query.startDate = value;
    else if (key === "endDate") query.endDate = value;
  }
  return query;
}

function asDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function actorName(performedBy: StockMovementRecord["performedBy"]): string {
  return typeof performedBy === "string"
    ? performedBy
    : `${performedBy.firstName} ${performedBy.lastName}`;
}

function movementTypeLabel(type: StockMovementType): string {
  return type.replaceAll("_", " ");
}

export default function StockMovementsPage() {
  const { movementId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const params = useMemo(
    () => new URLSearchParams(searchString),
    [searchString],
  );
  const query = useMemo(() => movementQuery(params), [params]);
  const [records, setRecords] = useState<StockMovementRecord[]>([]);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<StockMovementRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [optionsError, setOptionsError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (movementId) return;
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      setIsLoading(true);
      setError("");
      return stockMovementService.list(query);
    });
    void request
      .then((response) => {
        if (!active || !response) return;
        if (query.page && query.page > Math.max(1, response.pagination.totalPages)) {
          const updated = new URLSearchParams(searchString);
          updated.set("page", String(Math.max(1, response.pagination.totalPages)));
          setSearchParams(updated);
          return;
        }
        setRecords(response.data);
        setPagination(response.pagination);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setRecords([]);
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    const onStockChanged = () => setRetry((value) => value + 1);
    window.addEventListener(STOCK_DATA_UPDATED_EVENT, onStockChanged);
    return () => {
      active = false;
      window.removeEventListener(STOCK_DATA_UPDATED_EVENT, onStockChanged);
    };
  }, [movementId, query, retry, searchString, setSearchParams]);

  useEffect(() => {
    if (!movementId) return;
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      setDetailLoading(true);
      setDetailError("");
      setDetail(null);
      return stockMovementService.get(movementId);
    });
    void request
      .then((movement) => {
        if (active && movement) setDetail(movement);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setDetailError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [movementId, retry]);

  useEffect(() => {
    if (movementId) return;
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      return Promise.all([
        productService.list({ page: 1, limit: 50, status: "active", sortBy: "name", sortOrder: "asc" }),
        warehouseService.list({ page: 1, limit: 50, status: "active", sortBy: "name", sortOrder: "asc" }),
        locationService.list({
          page: 1,
          limit: 50,
          status: "active",
          ...(query.warehouse ? { warehouseId: query.warehouse } : {}),
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);
    });
    void request
      .then((results) => {
        if (!active || !results) return;
        setProducts(results[0].data);
        setWarehouses(results[1].data);
        setLocations(results[2].data);
        setOptionsError("");
      })
      .catch((requestError: unknown) => {
        if (active) setOptionsError(getErrorMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [movementId, query.warehouse, retry]);

  function updateFilter(key: keyof StockMovementQuery, value: string | number) {
    const updated = new URLSearchParams(searchString);
    if (value === "") updated.delete(key);
    else updated.set(key, String(value));
    if (key !== "page") updated.set("page", "1");
    setSearchParams(updated);
  }

  function filterOptions<T extends { _id: string; name: string; code?: string }>(
    items: T[],
  ) {
    return items.map((item) => ({
      value: item._id,
      label: item.code ? `${item.name} (${item.code})` : item.name,
    }));
  }

  const totalPages = Math.max(1, pagination.totalPages);
  const limit = pageLimit(params.get("limit"));
  const backPath =
    (location.state as { from?: string } | null)?.from ??
    `/stock-movements${location.search}`;

  return (
    <div className={`dashboard-wrapper stock-movements-page${movementId ? " movement-detail-page" : ""}`}>
      <AppNavigation activePath="/stock-movements" showBrand={false} />
      <main className="main-content stock-movements-content">
        <div className="topbar">
          <div className="movement-heading">
            <p className="inventory-eyebrow">INVENTORY CONTROL</p>
            <h1>{movementId ? "Movement details" : "Stock movement history"}</h1>
            <p>{movementId ? "Audit details for this recorded stock movement." : "Review stock changes, their location, and the user who recorded them."}</p>
          </div>
          <Link to="/stock-operations">Stock operations</Link>
        </div>
        <nav className="inventory-tabs" aria-label="Stock movement navigation">
          <Link to="/inventory">Inventory</Link>
          <Link to="/stock-operations">Stock operations</Link>
          <Link to="/stock-movements" aria-current={!movementId ? "page" : undefined}>
            Movement history
          </Link>
        </nav>
        {movementId ? (
          <>
            <p className="inventory-back-link"><Link to={backPath}>← Back to movement history</Link></p>
            {detailLoading || (!detailError && detail?.id !== movementId) ? (
              <div className="inventory-state inventory-loading" role="status">
                <span className="inventory-spinner" aria-hidden="true" />
                Loading movement details...
              </div>
            ) : detailError ? (
              <p className="master-data-error inventory-error" role="alert">
                {detailError}{" "}
                <button type="button" onClick={() => setRetry((value) => value + 1)}>
                  Retry
                </button>
              </p>
            ) : detail ? (
              <section className="movement-detail-card" aria-label="Movement audit details">
                <div className="movement-detail-banner">
                  <span className={`movement-type-badge movement-type-${detail.movementType.toLowerCase().replaceAll("_", "-")}`}>
                    {movementTypeLabel(detail.movementType)}
                  </span>
                  <div>
                    <h2>{detail.product.name}</h2>
                    <p>SKU {detail.product.sku} <span aria-hidden="true">·</span> {detail.product.unit}</p>
                  </div>
                </div>
                <dl className="master-data-details inventory-details movement-details">
                  <div><dt>Warehouse</dt><dd>{detail.warehouse.name} ({detail.warehouse.code})</dd></div>
                  <div><dt>Location</dt><dd>{detail.location.name} ({detail.location.code})</dd></div>
                  <div className="movement-detail-quantity"><dt>Movement quantity</dt><dd>{detail.quantity} {detail.product.unit}</dd></div>
                  <div><dt>Previous quantity</dt><dd>{detail.previousQuantity}</dd></div>
                  <div><dt>New quantity</dt><dd>{detail.newQuantity}</dd></div>
                  <div><dt>Reason</dt><dd>{detail.reason}</dd></div>
                  <div><dt>Reference</dt><dd>{detail.reference || "—"}</dd></div>
                  <div><dt>Notes</dt><dd>{detail.notes || "—"}</dd></div>
                  <div><dt>Performed by</dt><dd>{actorName(detail.performedBy)}</dd></div>
                  <div><dt>Created</dt><dd>{asDateTime(detail.createdAt)}</dd></div>
                </dl>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <div className="master-data-filters inventory-filters movement-filters">
              <select
                aria-label="Product"
                value={query.product ?? ""}
                onChange={(event) => updateFilter("product", event.target.value)}
              >
                <option value="">All products</option>
                {filterOptions(products).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select
                aria-label="Warehouse"
                value={query.warehouse ?? ""}
                onChange={(event) => {
                  const updated = new URLSearchParams(searchString);
                  if (event.target.value) updated.set("warehouse", event.target.value);
                  else updated.delete("warehouse");
                  updated.delete("location");
                  updated.set("page", "1");
                  setLocations([]);
                  setSearchParams(updated);
                }}
              >
                <option value="">All warehouses</option>
                {filterOptions(warehouses).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select
                aria-label="Location"
                value={query.location ?? ""}
                onChange={(event) => updateFilter("location", event.target.value)}
              >
                <option value="">All locations</option>
                {filterOptions(locations).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select
                aria-label="Movement type"
                value={query.type ?? ""}
                onChange={(event) => updateFilter("type", event.target.value)}
              >
                <option value="">All movement types</option>
                {MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{movementTypeLabel(type)}</option>)}
              </select>
              <input
                aria-label="Performed by user ID"
                placeholder="Performed by user ID"
                value={query.user ?? ""}
                onChange={(event) => updateFilter("user", event.target.value)}
              />
              <input
                aria-label="Reference"
                placeholder="Reference"
                value={query.reference ?? ""}
                onChange={(event) => updateFilter("reference", event.target.value)}
              />
              <label className="master-data-field">
                Start date
                <input
                  type="date"
                  aria-label="Start date"
                  value={query.startDate ?? ""}
                  onChange={(event) => updateFilter("startDate", event.target.value)}
                />
              </label>
              <label className="master-data-field">
                End date
                <input
                  type="date"
                  aria-label="End date"
                  value={query.endDate ?? ""}
                  onChange={(event) => updateFilter("endDate", event.target.value)}
                />
              </label>
              <select
                aria-label="Sort movements"
                value={query.sort ?? "-createdAt"}
                onChange={(event) => updateFilter("sort", event.target.value)}
              >
                <option value="-createdAt">Newest first</option>
                <option value="createdAt">Oldest first</option>
                <option value="-quantity">Quantity (high to low)</option>
                <option value="quantity">Quantity (low to high)</option>
                <option value="movementType">Movement type (A to Z)</option>
                <option value="-movementType">Movement type (Z to A)</option>
              </select>
              <select
                aria-label="Page size"
                value={limit}
                onChange={(event) => updateFilter("limit", Number(event.target.value))}
              >
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            {optionsError && (
              <p className="master-data-error inventory-error" role="alert">
                Could not load filter options: {optionsError}{" "}
                <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
              </p>
            )}
            {error && (
              <p className="master-data-error inventory-error" role="alert">
                {error}{" "}
                <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button>
              </p>
            )}
            {isLoading ? (
              <div className="inventory-state inventory-loading" role="status">
                <span className="inventory-spinner" aria-hidden="true" />
                Loading movement history...
              </div>
            ) : error ? null : records.length === 0 ? (
              <p className="inventory-empty-state" role="status">
                No stock movements match the selected filters.
              </p>
            ) : (
              <div className="inventory-table-wrap">
                <table className="activity-table movement-data-table">
                  <thead>
                    <tr>
                      <th>Movement type</th><th>Product</th><th>Quantity</th>
                      <th>Previous</th><th>New</th><th>Warehouse</th>
                      <th>Location</th><th>Reason</th><th>Reference</th>
                      <th>Performed by</th><th>Created</th><th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((movement) => (
                      <tr key={movement.id}>
                        <td>
                          <span className={`movement-type-badge movement-type-${movement.movementType.toLowerCase().replaceAll("_", "-")}`}>
                            {movementTypeLabel(movement.movementType)}
                          </span>
                        </td>
                        <td>{movement.product.name} ({movement.product.sku})</td>
                        <td>{movement.quantity} {movement.product.unit}</td>
                        <td>{movement.previousQuantity}</td>
                        <td>{movement.newQuantity}</td>
                        <td>{movement.warehouse.name} ({movement.warehouse.code})</td>
                        <td>{movement.location.name} ({movement.location.code})</td>
                        <td>{movement.reason}</td>
                        <td>{movement.reference || "—"}</td>
                        <td>{actorName(movement.performedBy)}</td>
                        <td>{asDateTime(movement.createdAt)}</td>
                        <td>
                          <Link
                            to={`/stock-movements/${encodeURIComponent(movement.id)}`}
                            state={{ from: `${location.pathname}${location.search}` }}
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
              <span>Page {pagination.page} of {totalPages} ({pagination.totalItems} total)</span>
              <button type="button" onClick={() => updateFilter("page", Math.max(1, pagination.page - 1))} disabled={isLoading || pagination.page <= 1}>Previous</button>
              <button type="button" onClick={() => updateFilter("page", Math.min(totalPages, pagination.page + 1))} disabled={isLoading || pagination.page >= totalPages}>Next</button>
              <button type="button" onClick={() => updateFilter("page", totalPages)} disabled={isLoading || Boolean(error) || pagination.page >= totalPages}>Last</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
