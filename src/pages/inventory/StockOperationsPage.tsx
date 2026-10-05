import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { usePermissions } from "../../auth/usePermissions";
import { useAuth } from "../../auth/useAuth";
import AppNavigation from "../../components/AppNavigation";
import { ApiError } from "../../services/api/apiClient";
import { inventoryService } from "../../services/inventory/inventoryService";
import { STOCK_DATA_UPDATED_EVENT } from "../../services/inventory/inventoryService";
import { stockMovementService } from "../../services/inventory/stockMovementService";
import { locationService } from "../../services/masterData/locationService";
import { productService } from "../../services/masterData/productService";
import { warehouseService } from "../../services/masterData/warehouseService";
import type {
  StockAdjustmentInput,
  StockOperationAttempt,
  StockOperationInput,
} from "../../types/inventory";
import type { LocationRecord, ProductRecord, WarehouseRecord } from "../../types/masterData";
import "../Warehouses/warehouse.css";
import "../../components/masterDataPage.css";
import "./inventory.css";

type OperationKind = "stock-in" | "stock-out" | "adjust";

interface OperationSuccess {
  message: string;
  movementId: string;
  replayed: boolean;
}

interface StoredOperationAttempt {
  attempt: StockOperationAttempt;
  createdAt: number;
}

const OPERATION_LABELS: Record<OperationKind, string> = {
  "stock-in": "Stock In",
  "stock-out": "Stock Out",
  adjust: "Adjustment",
};

function operationError(error: unknown, kind: OperationKind): string {
  if (!(error instanceof ApiError)) {
    return "The operation could not be completed. Retry this same operation; its idempotency key will be reused.";
  }
  if (error.status === 400) return error.message;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 403) return "You do not have permission to perform this operation.";
  if (error.status === 404) return "The selected product, warehouse, or location is no longer available.";
  if (error.status === 409) {
    if (kind === "stock-out") {
      const details =
        typeof error.details === "object" && error.details !== null
          ? (error.details as Record<string, unknown>)
          : {};
      const available = details.availableQuantity;
      const requested = details.requestedQuantity;
      if (typeof available === "number" && typeof requested === "number") {
        return `Insufficient stock. Available: ${available}; requested: ${requested}.`;
      }
      return "Insufficient stock for this stock-out.";
    }
    return error.message;
  }
  if (error.status === 503) {
    return "The backend could not run the stock transaction. Retry this same request with its existing key; do not create a new operation.";
  }
  if (error.status === 500 || error.status === null) {
    return "The result could not be confirmed. Retry this same request with its existing idempotency key.";
  }
  return error.message;
}

function canReleaseFailedAttempt(error: unknown): boolean {
  return error instanceof ApiError &&
    error.status !== null &&
    error.status < 500;
}

function makeIdempotencyKey(): string {
  return crypto.randomUUID();
}

function isStoredAttempt(value: unknown): value is StoredOperationAttempt {
  if (typeof value !== "object" || value === null || !("attempt" in value) || !("createdAt" in value)) {
    return false;
  }
  const stored = value as { attempt: unknown; createdAt: unknown };
  if (typeof stored.createdAt !== "number" || !Number.isFinite(stored.createdAt)) {
    return false;
  }
  if (typeof stored.attempt !== "object" || stored.attempt === null) return false;
  const attempt = stored.attempt as Record<string, unknown>;
  if (
    typeof attempt.idempotencyKey !== "string" ||
    attempt.idempotencyKey.length < 8 ||
    attempt.idempotencyKey.length > 128 ||
    !["stock-in", "stock-out", "adjust"].includes(String(attempt.kind)) ||
    typeof attempt.body !== "object" ||
    attempt.body === null
  ) {
    return false;
  }
  const body = attempt.body as Record<string, unknown>;
  return (
    typeof body.productId === "string" &&
    typeof body.warehouseId === "string" &&
    typeof body.locationId === "string" &&
    typeof body.reason === "string" &&
    (attempt.kind === "adjust"
      ? typeof body.newQuantity === "number"
      : typeof body.quantity === "number")
  );
}

function readPendingAttempt(storageKey: string): StoredOperationAttempt | null {
  try {
    const value = sessionStorage.getItem(storageKey);
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (isStoredAttempt(parsed)) return parsed;
    sessionStorage.removeItem(storageKey);
    return null;
  } catch (error) {
    console.error("Could not restore the pending stock operation.", error);
    return null;
  }
}

function persistPendingAttempt(
  storageKey: string,
  stored: StoredOperationAttempt | null,
): boolean {
  try {
    if (stored) sessionStorage.setItem(storageKey, JSON.stringify(stored));
    else sessionStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    console.error("Could not preserve the pending stock operation.", error);
    return false;
  }
}

export default function StockOperationsPage() {
  const { isAdmin, isManager } = usePermissions();
  const { currentUser } = useAuth();
  const mayAdjust = isAdmin || isManager;
  const { operationType } = useParams();
  const navigate = useNavigate();
  const pendingStorageKey = `pending-stock-operation:${currentUser?._id ?? "unknown"}`;
  const [storedAttempt, setStoredAttempt] = useState<StoredOperationAttempt | null>(
    () => readPendingAttempt(pendingStorageKey),
  );
  const [attempt, setAttempt] = useState<StockOperationAttempt | null>(
    storedAttempt?.attempt ?? null,
  );
  const kind: OperationKind = attempt?.kind ?? (
    operationType === "stock-out" ||
    (operationType === "adjust" && mayAdjust)
      ? operationType
      : "stock-in"
  );
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState<number | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [currentError, setCurrentError] = useState("");
  const attemptRef = useRef<StockOperationAttempt | null>(attempt);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationErrorText, setOperationErrorText] = useState("");
  const [success, setSuccess] = useState<OperationSuccess | null>(null);
  const [optionsRetry, setOptionsRetry] = useState(0);
  const [expiredAttempt, setExpiredAttempt] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submissionInFlight = useRef(false);

  useEffect(() => {
    if (!storedAttempt) return;
    const timeout = window.setTimeout(() => {
      setExpiredAttempt(
        Date.now() - storedAttempt.createdAt >= 24 * 60 * 60 * 1000,
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [storedAttempt]);

  useEffect(() => {
    let current = true;
    const request = Promise.resolve().then(() => {
      if (!current) return null;
      setIsLoadingOptions(true);
      setOptionsError("");
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
      ]);
    });
    void request
      .then((results) => {
        if (!current || !results) return;
        const [productResponse, warehouseResponse] = results;
        setProducts(productResponse.data);
        setWarehouses(warehouseResponse.data);
        setOptionsError("");
      })
      .catch((error: unknown) => {
        if (current) {
          setOptionsError(
            error instanceof ApiError
              ? error.message
              : "Could not load operation options.",
          );
        }
      })
      .finally(() => {
        if (current) setIsLoadingOptions(false);
      });
    return () => {
      current = false;
    };
  }, [optionsRetry]);

  useEffect(() => {
    if (!warehouseId) return;
    let current = true;
    const request = Promise.resolve().then(() => {
      if (!current) return null;
      return locationService.list({
        page: 1,
        limit: 50,
        status: "active",
        warehouseId,
        sortBy: "name",
        sortOrder: "asc",
      });
    });
    void request
      .then((response) => {
        if (current && response) setLocations(response.data);
      })
      .catch((error: unknown) => {
        if (current) {
          setCurrentError(
            error instanceof ApiError
              ? error.message
              : "Could not load locations for the selected warehouse.",
          );
        }
      });
    return () => {
      current = false;
    };
  }, [warehouseId]);

  useEffect(() => {
    if (kind !== "adjust" || !productId || !warehouseId || !locationId) return;
    let current = true;
    const request = Promise.resolve().then(() => {
      if (!current) return null;
      setIsLoadingCurrent(true);
      setCurrentError("");
      return inventoryService.list({
        product: productId,
        warehouse: warehouseId,
        location: locationId,
        page: 1,
        limit: 1,
      });
    });
    void request
      .then((response) => {
        if (!current || !response) return;
        setCurrentQuantity(response.data[0]?.quantity ?? 0);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setCurrentError(
          error instanceof ApiError
            ? error.message
            : "Could not load current inventory for validation.",
        );
      })
      .finally(() => {
        if (current) setIsLoadingCurrent(false);
      });
    return () => {
      current = false;
    };
  }, [kind, locationId, productId, warehouseId]);

  async function submitAttempt(nextAttempt: StockOperationAttempt): Promise<void> {
    if (submissionInFlight.current) return;
    if (
      storedAttempt &&
      Date.now() - storedAttempt.createdAt >= 24 * 60 * 60 * 1000
    ) {
      setExpiredAttempt(true);
      return;
    }
    submissionInFlight.current = true;
    setIsSubmitting(true);
    setOperationErrorText("");
    try {
      const result =
        nextAttempt.kind === "stock-in"
          ? await stockMovementService.stockIn(
              nextAttempt.body,
              nextAttempt.idempotencyKey,
            )
          : nextAttempt.kind === "stock-out"
            ? await stockMovementService.stockOut(
                nextAttempt.body,
                nextAttempt.idempotencyKey,
              )
            : await stockMovementService.adjust(
                nextAttempt.body,
                nextAttempt.idempotencyKey,
              );
      setSuccess({
        message: result.data.replayed
          ? `${OPERATION_LABELS[nextAttempt.kind]} was already completed. The original result has been returned.`
          : `${OPERATION_LABELS[nextAttempt.kind]} completed successfully.`,
        movementId: result.data.movement.id,
        replayed: result.data.replayed === true,
      });
      setCurrentQuantity(result.data.movement.newQuantity);
      attemptRef.current = null;
      setAttempt(null);
      setStoredAttempt(null);
      setExpiredAttempt(false);
      persistPendingAttempt(pendingStorageKey, null);
      formRef.current?.reset();
      window.dispatchEvent(new Event(STOCK_DATA_UPDATED_EVENT));
    } catch (error) {
      setOperationErrorText(operationError(error, nextAttempt.kind));
      if (canReleaseFailedAttempt(error)) {
        attemptRef.current = null;
        setAttempt(null);
        setStoredAttempt(null);
        setExpiredAttempt(false);
        persistPendingAttempt(pendingStorageKey, null);
      }
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (attemptRef.current || (kind === "adjust" && !mayAdjust)) return;
    const formData = new FormData(event.currentTarget);
    const numericValue = Number(formData.get(kind === "adjust" ? "newQuantity" : "quantity"));
    if (
      !Number.isFinite(numericValue) ||
      (kind === "adjust" ? numericValue < 0 : numericValue <= 0)
    ) {
      setOperationErrorText(
        kind === "adjust"
          ? "Enter a new quantity greater than or equal to zero."
          : "Enter a quantity greater than zero.",
      );
      return;
    }
    if (!productId || !warehouseId || !locationId) {
      setOperationErrorText("Select a product, warehouse, and location.");
      return;
    }
    if (!String(formData.get("reason") ?? "").trim()) {
      setOperationErrorText("A reason is required.");
      return;
    }
    if (kind === "adjust" && currentQuantity === null) {
      setOperationErrorText(
        "Current inventory is not available for adjustment validation. Retry loading it before submitting.",
      );
      return;
    }
    if (kind === "adjust" && currentQuantity === numericValue) {
      setOperationErrorText("The adjustment target must differ from the current quantity.");
      return;
    }
    const commonBody: Omit<StockOperationInput, "quantity"> = {
      productId,
      warehouseId,
      locationId,
      reason: String(formData.get("reason") ?? "").trim(),
    };
    const reference = String(formData.get("reference") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    if (reference) commonBody.reference = reference;
    if (notes) commonBody.notes = notes;

    const nextAttempt: StockOperationAttempt =
      kind === "adjust"
        ? {
            kind,
            body: { ...commonBody, newQuantity: numericValue } satisfies StockAdjustmentInput,
            idempotencyKey: makeIdempotencyKey(),
          }
        : {
            kind,
            body: { ...commonBody, quantity: numericValue } satisfies StockOperationInput,
            idempotencyKey: makeIdempotencyKey(),
          };
    const persisted = {
      attempt: nextAttempt,
      createdAt: Date.now(),
    };
    if (!persistPendingAttempt(pendingStorageKey, persisted)) {
      setOperationErrorText(
        "The pending operation could not be safely retained. The request was not sent; check browser storage and try again.",
      );
      return;
    }
    setStoredAttempt(persisted);
    setExpiredAttempt(false);
    attemptRef.current = nextAttempt;
    setAttempt(nextAttempt);
    setSuccess(null);
    void submitAttempt(nextAttempt);
  }

  const isLocked = Boolean(attempt) || isSubmitting;

  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/stock-operations" showBrand={false} />
      <main className="main-content">
        <div className="topbar">
          <h1>Stock Operations</h1>
          <Link to="/stock-movements">Movement history</Link>
        </div>
        <nav className="inventory-tabs" aria-label="Stock operation types">
          {(["stock-in", "stock-out", ...(mayAdjust ? ["adjust" as const] : [])] as const).map((operation) => (
            <button
              key={operation}
              type="button"
              aria-pressed={kind === operation}
              disabled={isLocked}
              onClick={() => {
                navigate(`/stock-operations/${operation}`);
                setSuccess(null);
                setOperationErrorText("");
                formRef.current?.reset();
                setCurrentQuantity(null);
                setCurrentError("");
                setIsLoadingCurrent(false);
              }}
            >
              {OPERATION_LABELS[operation]}
            </button>
          ))}
        </nav>

        {optionsError && (
          <p className="master-data-error" role="alert">
            {optionsError}{" "}
            <button type="button" onClick={() => setOptionsRetry((value) => value + 1)}>
              Retry
            </button>
          </p>
        )}
        {isLoadingOptions ? (
          <p role="status">Loading products and permitted warehouses...</p>
        ) : (
          <form
            ref={formRef}
            className="warehouse-form stock-operation-form"
            onSubmit={handleSubmit}
          >
            <h2>{OPERATION_LABELS[kind]}</h2>
            <label className="master-data-field">
              Product
              <select
                value={productId}
                onChange={(event) => {
                  const selectedProductId = event.target.value;
                  setProductId(selectedProductId);
                  setCurrentQuantity(null);
                  setCurrentError("");
                  setIsLoadingCurrent(
                    kind === "adjust" &&
                      Boolean(selectedProductId && warehouseId && locationId),
                  );
                }}
                required
                disabled={isLocked}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </label>
            <label className="master-data-field">
              Warehouse
              <select
                value={warehouseId}
                onChange={(event) => {
                  setWarehouseId(event.target.value);
                  setLocations([]);
                  setLocationId("");
                  setCurrentQuantity(null);
                  setCurrentError("");
                  setIsLoadingCurrent(false);
                }}
                required
                disabled={isLocked}
              >
                <option value="">Select a permitted warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="master-data-field">
              Location
              <select
                value={locationId}
                onChange={(event) => {
                  const selectedLocationId = event.target.value;
                  setLocationId(selectedLocationId);
                  setCurrentQuantity(null);
                  setCurrentError("");
                  setIsLoadingCurrent(
                    kind === "adjust" &&
                      Boolean(productId && warehouseId && selectedLocationId),
                  );
                }}
                required
                disabled={!warehouseId || isLocked}
              >
                <option value="">Select a location</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name} ({location.code})
                  </option>
                ))}
              </select>
            </label>
            {currentError && (
              <p className="master-data-error" role="alert">{currentError}</p>
            )}
            {isLoadingCurrent && <p role="status">Loading current quantity...</p>}
            {currentQuantity !== null && (
              <p role="status">
                Current quantity: {currentQuantity}{" "}
                {products.find((product) => product._id === productId)?.unit}
              </p>
            )}
            <label className="master-data-field">
              {kind === "adjust" ? "New quantity" : "Quantity"}
              <input
                name={kind === "adjust" ? "newQuantity" : "quantity"}
                type="number"
                min={kind === "adjust" ? 0 : Number.MIN_VALUE}
                step="any"
                required
                disabled={
                  isLocked ||
                  (kind === "adjust" &&
                    (isLoadingCurrent || Boolean(currentError)))
                }
                onChange={() => setOperationErrorText("")}
              />
            </label>
            <label className="master-data-field">
              Reason
              <input
                name="reason"
                type="text"
                maxLength={200}
                required
                disabled={isLocked}
              />
            </label>
            <label className="master-data-field">
              Reference (optional)
              <input
                name="reference"
                type="text"
                maxLength={100}
                disabled={isLocked}
              />
            </label>
            <label className="master-data-field">
              Notes (optional)
              <textarea
                name="notes"
                maxLength={1000}
                disabled={isLocked}
              />
            </label>
            {operationErrorText && (
              <p className="master-data-error" role="alert">
                {operationErrorText}
              </p>
            )}
            {success && (
              <p role="status" className="stock-operation-success">
                {success.message}{" "}
                <Link to={`/stock-movements/${encodeURIComponent(success.movementId)}`}>
                  View movement
                </Link>
              </p>
            )}
            {attempt && (
              <p role="status">
                The operation is retained with its original idempotency key.
              </p>
            )}
            <div className="master-data-actions">
              {attempt ? expiredAttempt ? (
                <p role="alert">
                  This operation's 24-hour idempotency window has expired. Do not resubmit it with a new key; verify its result in movement history first.
                  {" "}
                  <Link to={`/stock-movements?reference=${encodeURIComponent(attempt.body.reference ?? "")}`}>
                    Check movement history
                  </Link>
                </p>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void submitAttempt(attempt)}
                >
                  {isSubmitting ? "Submitting..." : "Retry same operation"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !productId ||
                    !warehouseId ||
                    !locationId ||
                    (kind === "adjust" &&
                      (!mayAdjust ||
                        isLoadingCurrent ||
                        Boolean(currentError) ||
                        currentQuantity === null))
                  }
                >
                  {isSubmitting ? "Submitting..." : `Confirm ${OPERATION_LABELS[kind]}`}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
