import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import AppNavigation from "../../components/AppNavigation";
import { useAuth } from "../../auth/useAuth";
import { usePermissions } from "../../auth/usePermissions";
import { ApiError } from "../../services/api/apiClient";
import { STOCK_DATA_UPDATED_EVENT } from "../../services/inventory/inventoryService";
import { locationService } from "../../services/masterData/locationService";
import { productService } from "../../services/masterData/productService";
import { warehouseService } from "../../services/masterData/warehouseService";
import { transferService, isTransferStatus } from "../../services/transfers/transferService";
import type { Pagination } from "../../types/api";
import type {
  CreateTransferInput,
  TransferListQuery,
  TransferRecord,
  TransferStatus,
} from "../../types/inventory";
import type { LocationRecord, ProductRecord, WarehouseRecord } from "../../types/masterData";
import "./transfers.css";
import "../Warehouses/warehouse.css";
import "../../components/masterDataPage.css";

const TRANSFER_STATUSES: TransferStatus[] = [
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 0,
};

function errorText(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "The request could not be completed. Please try again.";
  }
  if (error.status === 400) return error.message;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 403) return "You do not have permission to access this transfer.";
  if (error.status === 404) return "This transfer or one of its resources could not be found.";
  if (error.status === 409) {
    const details =
      typeof error.details === "object" && error.details !== null
        ? (error.details as Record<string, unknown>)
        : {};
    if (
      typeof details.availableQuantity === "number" &&
      typeof details.requestedQuantity === "number"
    ) {
      return `Insufficient stock. Available: ${details.availableQuantity}; requested: ${details.requestedQuantity}.`;
    }
    return error.message || "The transfer changed. Refresh and review its current state.";
  }
  if (error.status === 503) return "The transfer service is temporarily unavailable.";
  if (error.status === 500) return "The server could not complete the request.";
  if (error.status === null) return "The API could not be reached. Check the network connection.";
  return error.message;
}

function boundedPage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function boundedLimit(value: string | null): number {
  const limit = Number(value);
  return Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
}

function queryFromParams(params: URLSearchParams): TransferListQuery {
  const query: TransferListQuery = {
    page: boundedPage(params.get("page")),
    limit: boundedLimit(params.get("limit")),
    sort: params.get("sort") || "-createdAt",
  };
  const status = params.get("status");
  if (isTransferStatus(status)) query.status = status;
  for (const key of [
    "product",
    "sourceWarehouse",
    "destinationWarehouse",
    "initiatedBy",
    "reference",
    "startDate",
    "endDate",
  ] as const) {
    const value = params.get(key)?.trim();
    if (value) query[key] = value;
  }
  return query;
}

function entityId(value: { id: string } | string | null | undefined): string {
  if (!value) return "—";
  return typeof value === "string" ? value : value.id;
}

function entityLabel(
  value:
    | { id: string; name?: string; code?: string; firstName?: string; lastName?: string }
    | string
    | null
    | undefined,
): string {
  if (!value) return "—";
  if (typeof value === "string") return value;
  const fullName = [value.firstName, value.lastName].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return [value.name, value.code ? `(${value.code})` : ""]
    .filter(Boolean)
    .join(" ");
}

function timestamp(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function dateParameter(value: string, isEndDate = false): string | undefined {
  if (!value) return undefined;
  return new Date(
    `${value}T${isEndDate ? "23:59:59.999" : "00:00:00.000"}Z`,
  ).toISOString();
}

function TransferCreationForm({
  onCreated,
}: {
  onCreated(record: TransferRecord): void;
}) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [sourceLocations, setSourceLocations] = useState<LocationRecord[]>([]);
  const [destinationLocations, setDestinationLocations] = useState<LocationRecord[]>([]);
  const [productId, setProductId] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      productService.list({ page: 1, limit: 50, status: "active", sortBy: "name", sortOrder: "asc" }),
      warehouseService.list({ page: 1, limit: 50, status: "active", sortBy: "name", sortOrder: "asc" }),
    ])
      .then(([productResponse, warehouseResponse]) => {
        if (!active) return;
        setProducts(productResponse.data);
        setWarehouses(warehouseResponse.data);
      })
      .catch((reason: unknown) => {
        if (active) setOptionsError(errorText(reason));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sourceWarehouseId) return;
    let active = true;
    void locationService
      .list({
        page: 1,
        limit: 50,
        status: "active",
        warehouseId: sourceWarehouseId,
        sortBy: "name",
        sortOrder: "asc",
      })
      .then((response) => {
        if (active) setSourceLocations(response.data);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [sourceWarehouseId]);

  useEffect(() => {
    if (!destinationWarehouseId) return;
    let active = true;
    void locationService
      .list({
        page: 1,
        limit: 50,
        status: "active",
        warehouseId: destinationWarehouseId,
        sortBy: "name",
        sortOrder: "asc",
      })
      .then((response) => {
        if (active) setDestinationLocations(response.data);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [destinationWarehouseId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const quantity = Number(data.get("quantity"));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setError("Source and destination locations must be different.");
      return;
    }
    const body: CreateTransferInput = {
      productId,
      quantity,
      sourceWarehouseId,
      sourceLocationId,
      destinationWarehouseId,
      destinationLocationId,
      ...(String(data.get("reference") ?? "").trim()
        ? { reference: String(data.get("reference")).trim() }
        : {}),
      ...(String(data.get("notes") ?? "").trim()
        ? { notes: String(data.get("notes")).trim() }
        : {}),
    };
    setIsSubmitting(true);
    submissionInFlight.current = true;
    setError("");
    try {
      const created = await transferService.create(body);
      onCreated(created);
      form.reset();
      setProductId("");
      setSourceWarehouseId("");
      setSourceLocationId("");
      setDestinationWarehouseId("");
      setDestinationLocationId("");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        const details =
          typeof reason.details === "object" && reason.details !== null
            ? (reason.details as Record<string, unknown>)
            : {};
        setError(
          typeof details.availableQuantity === "number" &&
            typeof details.requestedQuantity === "number"
            ? `Insufficient stock. Available: ${details.availableQuantity}; requested: ${details.requestedQuantity}.`
            : reason.message,
        );
      } else {
        setError(errorText(reason));
      }
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <p role="status">Loading active products and permitted warehouses...</p>;
  if (optionsError) return <p className="master-data-error" role="alert">{optionsError}</p>;

  return (
    <form className="warehouse-form transfer-form" onSubmit={submit}>
      <h2>Request Transfer</h2>
      <label className="master-data-field">
        Product
        <select value={productId} onChange={(event) => setProductId(event.target.value)} required disabled={isSubmitting}>
          <option value="">Select an active product</option>
          {products.map((product) => (
            <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>
          ))}
        </select>
      </label>
      <label className="master-data-field">
        Source warehouse
        <select
          value={sourceWarehouseId}
          onChange={(event) => {
            setSourceWarehouseId(event.target.value);
            setSourceLocationId("");
            setSourceLocations([]);
          }}
          required
          disabled={isSubmitting}
        >
          <option value="">Select source warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>
          ))}
        </select>
      </label>
      <label className="master-data-field">
        Source location
        <select
          value={sourceLocationId}
          onChange={(event) => setSourceLocationId(event.target.value)}
          required
          disabled={!sourceWarehouseId || isSubmitting}
        >
          <option value="">Select source location</option>
          {sourceLocations.map((location) => (
            <option key={location._id} value={location._id}>{location.name} ({location.code})</option>
          ))}
        </select>
      </label>
      <label className="master-data-field">
        Destination warehouse
        <select
          value={destinationWarehouseId}
          onChange={(event) => {
            setDestinationWarehouseId(event.target.value);
            setDestinationLocationId("");
            setDestinationLocations([]);
          }}
          required
          disabled={isSubmitting}
        >
          <option value="">Select destination warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>
          ))}
        </select>
      </label>
      <label className="master-data-field">
        Destination location
        <select
          value={destinationLocationId}
          onChange={(event) => setDestinationLocationId(event.target.value)}
          required
          disabled={!destinationWarehouseId || isSubmitting}
        >
          <option value="">Select destination location</option>
          {destinationLocations.map((location) => (
            <option
              key={location._id}
              value={location._id}
              disabled={location._id === sourceLocationId}
            >
              {location.name} ({location.code})
            </option>
          ))}
        </select>
      </label>
      <label className="master-data-field">
        Quantity
        <input name="quantity" type="number" min="0.0000001" step="any" required disabled={isSubmitting} />
      </label>
      <label className="master-data-field">
        Reference (optional)
        <input name="reference" type="text" maxLength={100} disabled={isSubmitting} />
      </label>
      <label className="master-data-field">
        Notes (optional)
        <textarea name="notes" maxLength={1000} disabled={isSubmitting} />
      </label>
      {error && <p className="master-data-error" role="alert">{error}</p>}
      <div className="master-data-actions">
        <button type="submit" disabled={isSubmitting || sourceLocationId === destinationLocationId}>
          {isSubmitting ? "Submitting..." : "Request transfer"}
        </button>
      </div>
    </form>
  );
}

function TransferDetails({ transfer }: { transfer: TransferRecord }) {
  const productName = typeof transfer.product === "string" ? transfer.product : transfer.product.name ?? transfer.product.id;
  const sku = typeof transfer.product === "string" ? "—" : transfer.product.sku ?? "—";
  const unit = typeof transfer.product === "string" ? "" : transfer.product.unit ?? "";
  return (
    <dl className="master-data-details">
      <div><dt>Reference</dt><dd>{transfer.reference}</dd></div>
      <div><dt>Status</dt><dd>{transfer.status}</dd></div>
      <div><dt>Product</dt><dd>{productName}</dd></div>
      <div><dt>SKU</dt><dd>{sku}</dd></div>
      <div><dt>Unit</dt><dd>{unit || "—"}</dd></div>
      <div><dt>Quantity</dt><dd>{transfer.quantity} {unit}</dd></div>
      <div><dt>Source warehouse</dt><dd>{entityLabel(transfer.sourceWarehouse)}</dd></div>
      <div><dt>Source location</dt><dd>{entityLabel(transfer.sourceLocation)}</dd></div>
      <div><dt>Destination warehouse</dt><dd>{entityLabel(transfer.destinationWarehouse)}</dd></div>
      <div><dt>Destination location</dt><dd>{entityLabel(transfer.destinationLocation)}</dd></div>
      <div><dt>Initiator</dt><dd>{entityLabel(transfer.initiatedBy)}</dd></div>
      <div><dt>Approver</dt><dd>{entityLabel(transfer.approvedBy)}</dd></div>
      <div><dt>Rejector</dt><dd>{entityLabel(transfer.rejectedBy)}</dd></div>
      <div><dt>Completer</dt><dd>{entityLabel(transfer.completedBy)}</dd></div>
      <div><dt>Canceller</dt><dd>{entityLabel(transfer.cancelledBy)}</dd></div>
      <div><dt>Created</dt><dd>{timestamp(transfer.createdAt)}</dd></div>
      <div><dt>Approved</dt><dd>{timestamp(transfer.approvedAt)}</dd></div>
      <div><dt>Rejected</dt><dd>{timestamp(transfer.rejectedAt)}</dd></div>
      <div><dt>Completed</dt><dd>{timestamp(transfer.completedAt)}</dd></div>
      <div><dt>Cancelled</dt><dd>{timestamp(transfer.cancelledAt)}</dd></div>
      <div><dt>Notes</dt><dd>{transfer.notes || "—"}</dd></div>
      <div><dt>Rejection reason</dt><dd>{transfer.rejectionReason || "—"}</dd></div>
    </dl>
  );
}

export default function Transfers() {
  const { transferId } = useParams();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { role, can } = usePermissions();
  const isManagerOrAdmin = role === "ADMIN" || role === "MANAGER";
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const query = useMemo(() => queryFromParams(params), [params]);
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [filterProducts, setFilterProducts] = useState<ProductRecord[]>([]);
  const [filterWarehouses, setFilterWarehouses] = useState<WarehouseRecord[]>([]);
  const [filterOptionsError, setFilterOptionsError] = useState("");
  const [filterOptionsReload, setFilterOptionsReload] = useState(0);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detail, setDetail] = useState<TransferRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState("");
  const [action, setAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionConflict, setActionConflict] = useState(false);
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const actionInFlight = useRef(false);

  useEffect(() => {
    if (transferId) return;
    let active = true;
    void Promise.all([
      productService.list({ page: 1, limit: 50, status: "active", sortBy: "name", sortOrder: "asc" }),
      warehouseService.list({ page: 1, limit: 50, status: "active", sortBy: "name", sortOrder: "asc" }),
    ])
      .then(([products, warehouses]) => {
        if (!active) return;
        setFilterProducts(products.data);
        setFilterWarehouses(warehouses.data);
      })
      .catch((reason: unknown) => {
        if (active) setFilterOptionsError(errorText(reason));
      });
    return () => {
      active = false;
    };
  }, [filterOptionsReload, transferId]);

  useEffect(() => {
    if (transferId) return;
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      setIsLoading(true);
      setListError("");
      return transferService.list(query);
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
      .catch((reason: unknown) => {
        if (!active) return;
        setRecords([]);
        setListError(errorText(reason));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, reload, searchString, setSearchParams, transferId]);

  useEffect(() => {
    if (!transferId) return;
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      setDetailLoading(true);
      setDetailError("");
      return transferService.get(transferId);
    });
    void request
      .then((record) => {
        if (active && record) setDetail(record);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setDetail(null);
        setDetailError(errorText(reason));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, transferId]);

  function updateFilter(key: keyof TransferListQuery, value: string | number) {
    const updated = new URLSearchParams(searchString);
    if (value === "") updated.delete(key);
    else updated.set(key, String(value));
    if (key !== "page") updated.set("page", "1");
    setSearchParams(updated);
  }

  async function runAction(
    name: "approve" | "reject" | "cancel" | "complete",
  ) {
    if (!transferId || actionInFlight.current) return;
    if (name === "reject" && !rejectionReason.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }
    actionInFlight.current = true;
    setAction(name);
    setActionError("");
    setActionConflict(false);
    setSuccess("");
    try {
      if (name === "approve") await transferService.approve(transferId);
      else if (name === "reject") await transferService.reject(transferId, rejectionReason.trim());
      else if (name === "cancel") await transferService.cancel(transferId);
      else await transferService.complete(transferId);
      setSuccess(`Transfer ${name === "complete" ? "completed" : `${name}d`} successfully.`);
      setShowRejectForm(false);
      setRejectionReason("");
      setReload((value) => value + 1);
      if (name === "complete") {
        window.dispatchEvent(new Event(STOCK_DATA_UPDATED_EVENT));
        window.dispatchEvent(new Event("transfer-completed"));
      }
    } catch (reason) {
      setActionError(
        name === "complete" &&
          reason instanceof ApiError &&
          reason.status === 503
          ? "Transfer completion is temporarily unavailable because the backend transaction service is unavailable."
          : errorText(reason),
      );
      if (reason instanceof ApiError && reason.status === 409) {
        setActionConflict(true);
        setReload((value) => value + 1);
      }
    } finally {
      actionInFlight.current = false;
      setAction("");
    }
  }

  function isInitiator(record: TransferRecord): boolean {
    return entityId(record.initiatedBy) === currentUser?._id;
  }

  const canCancel = detail
    ? can("transfers:cancel-own") && (isInitiator(detail) || isManagerOrAdmin)
    : false;
  const canReview = isManagerOrAdmin && can("transfers:review");
  const totalPages = Math.max(1, pagination.totalPages);
  const limit = boundedLimit(params.get("limit"));
  const returnPath =
    (location.state as { from?: string } | null)?.from ??
    `/transfers${location.search}`;

  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/transfers" showBrand={false} />
      <main className="main-content">
        <div className="topbar">
          <h1>{transferId ? "Transfer Details" : "Transfers"}</h1>
          {!transferId && can("transfers:request") && (
            <button className="add-warehouse-btn" type="button" onClick={() => setIsCreating((show) => !show)}>
              {isCreating ? "Close request form" : "+ Request Transfer"}
            </button>
          )}
        </div>

        {transferId ? (
          <>
            <p><Link to={returnPath}>Back to transfers</Link></p>
            {detailLoading ? (
              <p role="status">Loading transfer details...</p>
            ) : detailError ? (
              <p className="master-data-error" role="alert">
                {detailError}{" "}
                <button type="button" onClick={() => setReload((value) => value + 1)}>Retry</button>
              </p>
            ) : detail ? (
              <>
                <TransferDetails transfer={detail} />
                {actionError && (
                  <p className="master-data-error" role="alert">
                    {actionError}
                    {actionConflict && (
                      <button type="button" onClick={() => setReload((value) => value + 1)}>Refresh transfer</button>
                    )}
                  </p>
                )}
                <div className="transfer-actions">
                  {detail.status === "PENDING" && canReview && (
                    <>
                      <button type="button" className="btn-primary" disabled={Boolean(action)} onClick={() => void runAction("approve")}>
                        {action === "approve" ? "Approving..." : "Approve"}
                      </button>
                      {!showRejectForm ? (
                        <button type="button" disabled={Boolean(action)} onClick={() => setShowRejectForm(true)}>Reject</button>
                      ) : (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void runAction("reject");
                          }}
                        >
                          <label className="master-data-field">
                            Rejection reason
                            <textarea
                              value={rejectionReason}
                              onChange={(event) => setRejectionReason(event.target.value)}
                              maxLength={500}
                              required
                              disabled={Boolean(action)}
                            />
                          </label>
                          <button type="submit" disabled={Boolean(action) || !rejectionReason.trim()}>
                            {action === "reject" ? "Rejecting..." : "Confirm rejection"}
                          </button>
                          <button type="button" disabled={Boolean(action)} onClick={() => setShowRejectForm(false)}>Keep transfer</button>
                        </form>
                      )}
                    </>
                  )}
                  {detail.status === "APPROVED" && canReview && (
                    <button type="button" className="btn-primary" disabled={Boolean(action)} onClick={() => void runAction("complete")}>
                      {action === "complete" ? "Completing..." : "Complete"}
                    </button>
                  )}
                  {(detail.status === "PENDING" || detail.status === "APPROVED") && canCancel && (
                    <button type="button" disabled={Boolean(action)} onClick={() => void runAction("cancel")}>
                      {action === "cancel" ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            {isCreating && can("transfers:request") && (
              <TransferCreationForm
                onCreated={(record) => {
                  setCreateSuccess(`Transfer ${record.reference} requested.`);
                  setIsCreating(false);
                  setSearchParams((current) => {
                    const updated = new URLSearchParams(current);
                    updated.set("page", "1");
                    return updated;
                  });
                  setReload((value) => value + 1);
                }}
              />
            )}
            {createSuccess && <p role="status">{createSuccess}</p>}
            {success && <p role="status">{success}</p>}
            <div className="master-data-filters transfer-filters">
              <select aria-label="Status" value={query.status ?? ""} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="">All statuses</option>
                {TRANSFER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select aria-label="Product" value={query.product ?? ""} onChange={(event) => updateFilter("product", event.target.value)}>
                <option value="">All products</option>
                {filterProducts.map((product) => (
                  <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>
                ))}
              </select>
              <select aria-label="Source warehouse" value={query.sourceWarehouse ?? ""} onChange={(event) => updateFilter("sourceWarehouse", event.target.value)}>
                <option value="">All source warehouses</option>
                {filterWarehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>
                ))}
              </select>
              <select aria-label="Destination warehouse" value={query.destinationWarehouse ?? ""} onChange={(event) => updateFilter("destinationWarehouse", event.target.value)}>
                <option value="">All destination warehouses</option>
                {filterWarehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>
                ))}
              </select>
              <input aria-label="Initiator user ID" placeholder="Initiator user ID" value={query.initiatedBy ?? ""} onChange={(event) => updateFilter("initiatedBy", event.target.value)} />
              <input aria-label="Reference" placeholder="Reference" value={query.reference ?? ""} onChange={(event) => updateFilter("reference", event.target.value)} />
              <label className="master-data-field">Start date<input type="date" value={params.get("startDate") ?? ""} onChange={(event) => updateFilter("startDate", dateParameter(event.target.value) ?? "")} /></label>
              <label className="master-data-field">End date<input type="date" value={params.get("endDate")?.slice(0, 10) ?? ""} onChange={(event) => updateFilter("endDate", dateParameter(event.target.value, true) ?? "")} /></label>
              <select aria-label="Sort transfers" value={query.sort ?? "-createdAt"} onChange={(event) => updateFilter("sort", event.target.value)}>
                <option value="-createdAt">Newest first</option>
                <option value="createdAt">Oldest first</option>
                <option value="updatedAt">Recently updated</option>
                <option value="-updatedAt">Least recently updated</option>
                <option value="reference">Reference A–Z</option>
                <option value="-reference">Reference Z–A</option>
                <option value="status">Status A–Z</option>
                <option value="-status">Status Z–A</option>
                <option value="quantity">Quantity low to high</option>
                <option value="-quantity">Quantity high to low</option>
              </select>
              <select aria-label="Page size" value={limit} onChange={(event) => updateFilter("limit", Number(event.target.value))}>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            {filterOptionsError && (
              <p className="master-data-error" role="alert">
                Could not load transfer filter options. {filterOptionsError}{" "}
                <button type="button" onClick={() => {
                  setFilterOptionsError("");
                  setFilterOptionsReload((value) => value + 1);
                }}>Retry options</button>
              </p>
            )}
            {listError && <p className="master-data-error" role="alert">{listError} <button type="button" onClick={() => setReload((value) => value + 1)}>Retry</button></p>}
            {isLoading ? (
              <p role="status">Loading transfers...</p>
            ) : listError ? null : records.length === 0 ? (
              <p role="status">No transfers match the selected filters.</p>
            ) : (
              <div className="transfer-table-wrap">
                <table className="activity-table">
                  <thead>
                    <tr><th>Reference</th><th>Product</th><th>Quantity</th><th>Source</th><th>Destination</th><th>Initiated by</th><th>Status</th><th>Created</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {records.map((transfer) => (
                      <tr key={transfer.id}>
                        <td>{transfer.reference}</td>
                        <td>{entityLabel(transfer.product)}</td>
                        <td>{transfer.quantity}</td>
                        <td>{entityLabel(transfer.sourceWarehouse)} / {entityLabel(transfer.sourceLocation)}</td>
                        <td>{entityLabel(transfer.destinationWarehouse)} / {entityLabel(transfer.destinationLocation)}</td>
                        <td>{entityLabel(transfer.initiatedBy)}</td>
                        <td><span className={`pill ${transfer.status === "COMPLETED" ? "pill-ok" : transfer.status === "PENDING" ? "pill-warn" : transfer.status === "REJECTED" || transfer.status === "CANCELLED" ? "pill-danger" : "pill-ok"}`}>{transfer.status}</span></td>
                        <td>{timestamp(transfer.createdAt)}</td>
                        <td><Link to={`/transfers/${encodeURIComponent(transfer.id)}`} state={{ from: `${location.pathname}${location.search}` }}>View</Link></td>
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
              <button type="button" onClick={() => updateFilter("page", totalPages)} disabled={isLoading || Boolean(listError) || pagination.page >= totalPages}>Last</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
