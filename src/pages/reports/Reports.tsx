import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import AppNavigation from "../../components/AppNavigation";
import { ApiError } from "../../services/api/apiClient";
import {
  defaultReportSort,
  reportService,
  type ReportKind,
  type ReportQuery,
  type ReportRow,
  type WarehouseInventoryReportRow,
} from "../../services/reports/reportService";
import type {
  InventoryRecord,
  StockMovementRecord,
  TransferRecord,
} from "../../types/inventory";
import "./reports.css";
import "../dashboard/dashboard.css";
import "../../components/masterDataPage.css";

const REPORTS: Array<{ kind: ReportKind; label: string }> = [
  { kind: "inventory", label: "Inventory" },
  { kind: "warehouse-inventory", label: "Warehouse inventory" },
  { kind: "low-stock", label: "Low stock" },
  { kind: "stock-movements", label: "Stock movements" },
  { kind: "transfers", label: "Transfers" },
];

const MOVEMENT_TYPES = [
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
] as const;

const TRANSFER_STATUSES = [
  "PENDING",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

interface FilterField {
  key: keyof ReportQuery;
  label: string;
  type?: "date" | "select" | "search";
  options?: readonly string[];
}

const COMMON_INVENTORY_FIELDS: FilterField[] = [
  { key: "warehouse", label: "Warehouse ID" },
  { key: "location", label: "Location ID" },
  { key: "product", label: "Product ID" },
  { key: "category", label: "Category ID" },
  { key: "search", label: "Search product / SKU", type: "search" },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "endDate", label: "End date", type: "date" },
];

function fieldsFor(kind: ReportKind): FilterField[] {
  if (kind === "inventory") {
    return [
      ...COMMON_INVENTORY_FIELDS.slice(0, 4),
      {
        key: "stockStatus",
        label: "Stock status",
        type: "select",
        options: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"],
      },
      ...COMMON_INVENTORY_FIELDS.slice(4),
    ];
  }
  if (kind === "low-stock" || kind === "warehouse-inventory") {
    return COMMON_INVENTORY_FIELDS;
  }
  if (kind === "stock-movements") {
    return [
      { key: "warehouse", label: "Warehouse ID" },
      { key: "location", label: "Location ID" },
      { key: "product", label: "Product ID" },
      {
        key: "movementType",
        label: "Movement type",
        type: "select",
        options: MOVEMENT_TYPES,
      },
      { key: "performedBy", label: "Performed by user ID" },
      { key: "search", label: "Search / reference", type: "search" },
      { key: "startDate", label: "Start date", type: "date" },
      { key: "endDate", label: "End date", type: "date" },
    ];
  }
  return [
    { key: "warehouse", label: "Warehouse ID" },
    { key: "sourceWarehouse", label: "Source warehouse ID" },
    { key: "destinationWarehouse", label: "Destination warehouse ID" },
    { key: "product", label: "Product ID" },
    {
      key: "transferStatus",
      label: "Transfer status",
      type: "select",
      options: TRANSFER_STATUSES,
    },
    { key: "initiatedBy", label: "Initiated by user ID" },
    { key: "search", label: "Search / reference", type: "search" },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "endDate", label: "End date", type: "date" },
  ];
}

function sortOptions(kind: ReportKind): Array<[string, string]> {
  if (kind === "inventory" || kind === "low-stock") {
    return [
      ["-updatedAt", "Recently updated"],
      ["updatedAt", "Least recently updated"],
      ["quantity", "Quantity low to high"],
      ["-quantity", "Quantity high to low"],
      ["productName", "Product name A–Z"],
      ["-productName", "Product name Z–A"],
      ["sku", "SKU A–Z"],
      ["-sku", "SKU Z–A"],
      ["createdAt", "Oldest created"],
      ["-createdAt", "Newest created"],
    ];
  }
  if (kind === "warehouse-inventory") {
    return [
      ["warehouseName", "Warehouse name A–Z"],
      ["-warehouseName", "Warehouse name Z–A"],
      ["totalInventoryUnits", "Inventory units low to high"],
      ["-totalInventoryUnits", "Inventory units high to low"],
      ["productCount", "Product count low to high"],
      ["-productCount", "Product count high to low"],
      ["locationCount", "Location count low to high"],
      ["-locationCount", "Location count high to low"],
    ];
  }
  if (kind === "stock-movements") {
    return [
      ["-createdAt", "Newest first"],
      ["createdAt", "Oldest first"],
      ["quantity", "Quantity low to high"],
      ["-quantity", "Quantity high to low"],
      ["movementType", "Movement type A–Z"],
      ["-movementType", "Movement type Z–A"],
    ];
  }
  return [
    ["-createdAt", "Newest first"],
    ["createdAt", "Oldest first"],
    ["-updatedAt", "Recently updated"],
    ["updatedAt", "Least recently updated"],
    ["reference", "Reference A–Z"],
    ["-reference", "Reference Z–A"],
    ["status", "Status A–Z"],
    ["-status", "Status Z–A"],
    ["quantity", "Quantity low to high"],
    ["-quantity", "Quantity high to low"],
  ];
}

function reportError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "The report could not be loaded. Check the network connection and try again.";
  }
  if (error.status === 400) return error.message;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 403) return "You do not have access to the requested report data or warehouse.";
  if (error.status === 404) return "The requested report resource was not found.";
  if (error.status === 503) return "The reporting service is temporarily unavailable.";
  if (error.status !== null && error.status >= 500) {
    return "The server could not load this report.";
  }
  return error.message;
}

function readFilters(params: URLSearchParams): Record<string, string> {
  return Object.fromEntries(
    [
      "warehouse",
      "sourceWarehouse",
      "destinationWarehouse",
      "location",
      "product",
      "category",
      "stockStatus",
      "movementType",
      "performedBy",
      "transferStatus",
      "search",
      "startDate",
      "endDate",
    ]
      .map((key) => [key, params.get(key) ?? ""])
      .filter(([, value]) => value !== ""),
  );
}

function toQuery(params: URLSearchParams, kind: ReportKind): ReportQuery {
  const query: ReportQuery = {
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: Math.min(50, Math.max(1, Number(params.get("limit")) || 20)),
    sort: params.get("sort") || defaultReportSort(kind),
  };
  for (const field of fieldsFor(kind)) {
    const value = params.get(field.key);
    if (value) Object.assign(query, { [field.key]: value });
  }
  return query;
}

function entityName(value: { name?: string; code?: string } | string | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return [value.name, value.code ? `(${value.code})` : ""]
    .filter(Boolean)
    .join(" ");
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ReportTable({
  kind,
  rows,
}: {
  kind: ReportKind;
  rows: ReportRow[];
}) {
  if (kind === "warehouse-inventory") {
    return (
      <table className="activity-table">
        <thead><tr><th>Warehouse</th><th>Inventory units</th><th>Inventory records</th><th>Products</th><th>Locations</th><th>Low-stock records</th><th>Out-of-stock records</th></tr></thead>
        <tbody>{rows.map((row) => {
          const item = row as WarehouseInventoryReportRow;
          return <tr key={item.warehouse.id}><td>{entityName(item.warehouse)}</td><td>{item.totalInventoryUnits}</td><td>{item.inventoryRecordCount}</td><td>{item.productCount}</td><td>{item.locationCount}</td><td>{item.lowStockRecordCount}</td><td>{item.outOfStockRecordCount}</td></tr>;
        })}</tbody>
      </table>
    );
  }
  if (kind === "inventory" || kind === "low-stock") {
    return (
      <table className="activity-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Unit</th><th>Category</th><th>Warehouse</th><th>Location</th><th>Quantity</th><th>Minimum stock</th><th>Status</th><th>Updated</th></tr></thead>
        <tbody>{rows.map((row) => {
          const item = row as InventoryRecord;
          return <tr key={item.id}><td>{item.product.name}</td><td>{item.product.sku}</td><td>{item.product.unit}</td><td>{item.category?.name ?? "—"}</td><td>{entityName(item.warehouse)}</td><td>{entityName(item.location)}</td><td>{item.quantity}</td><td>{item.minimumStockLevel}</td><td>{item.stockStatus}</td><td>{dateTime(item.updatedAt)}</td></tr>;
        })}</tbody>
      </table>
    );
  }
  if (kind === "stock-movements") {
    return (
      <table className="activity-table">
        <thead><tr><th>Movement</th><th>Product</th><th>Warehouse / location</th><th>Quantity</th><th>Previous quantity</th><th>New quantity</th><th>Reason</th><th>Reference</th><th>Performed by</th><th>Date</th></tr></thead>
        <tbody>{rows.map((row) => {
          const item = row as StockMovementRecord;
          const actor = typeof item.performedBy === "string" ? item.performedBy : [item.performedBy.firstName, item.performedBy.lastName].filter(Boolean).join(" ");
          return <tr key={item.id}><td>{item.movementType}</td><td>{item.product.name} ({item.product.sku})</td><td>{entityName(item.warehouse)} / {entityName(item.location)}</td><td>{item.quantity}</td><td>{item.previousQuantity}</td><td>{item.newQuantity}</td><td>{item.reason}</td><td>{item.reference || "—"}</td><td>{actor || "—"}</td><td>{dateTime(item.createdAt)}</td></tr>;
        })}</tbody>
      </table>
    );
  }
  return (
    <table className="activity-table">
      <thead><tr><th>Reference</th><th>Status</th><th>Product</th><th>Quantity</th><th>Source</th><th>Destination</th><th>Initiated by</th><th>Created</th></tr></thead>
      <tbody>{rows.map((row) => {
        const item = row as TransferRecord;
        const product = typeof item.product === "string" ? item.product : `${item.product.name ?? item.product.id}${item.product.sku ? ` (${item.product.sku})` : ""}`;
        const initiatedBy = typeof item.initiatedBy === "string" ? item.initiatedBy : [item.initiatedBy.firstName, item.initiatedBy.lastName].filter(Boolean).join(" ");
        return <tr key={item.id}><td>{item.reference}</td><td>{item.status}</td><td>{product}</td><td>{item.quantity}</td><td>{entityName(item.sourceWarehouse)} / {entityName(item.sourceLocation)}</td><td>{entityName(item.destinationWarehouse)} / {entityName(item.destinationLocation)}</td><td>{initiatedBy || "—"}</td><td>{dateTime(item.createdAt)}</td></tr>;
      })}</tbody>
    </table>
  );
}

function ReportView({ kind }: { kind: ReportKind }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchString = searchParams.toString();
  const queryParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const query = useMemo(() => toQuery(queryParams, kind), [kind, queryParams]);
  const [draft, setDraft] = useState(() => readFilters(queryParams));
  const [draftSort, setDraftSort] = useState(query.sort ?? defaultReportSort(kind));
  const [draftLimit, setDraftLimit] = useState(String(query.limit ?? 20));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      setLoading(true);
      setError("");
      return reportService.list(kind, query);
    });
    void request
      .then((response) => {
        if (!active || !response) return;
        const maxPage = Math.max(response.pagination.totalPages, 1);
        if (query.page && query.page > maxPage) {
          const corrected = new URLSearchParams(searchString);
          corrected.set("page", String(maxPage));
          setSearchParams(corrected, { replace: true });
          return;
        }
        setRows(response.data);
        setPagination(response.pagination);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setRows([]);
        setError(reportError(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, query, reload, searchString, setSearchParams]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      setFilterError("End date must not be earlier than start date.");
      return;
    }
    setFilterError("");
    const updated = new URLSearchParams(searchString);
    for (const field of fieldsFor(kind)) {
      const value = draft[field.key]?.trim();
      if (value) updated.set(field.key, value);
      else updated.delete(field.key);
    }
    updated.set("page", "1");
    updated.set("limit", draftLimit);
    updated.set("sort", draftSort);
    setSearchParams(updated);
  }

  function changePage(page: number) {
    const updated = new URLSearchParams(searchString);
    updated.set("page", String(page));
    setSearchParams(updated);
  }

  const pageCount = Math.max(1, pagination.totalPages);

  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/reports" />
      <main className="main-content">
        <div className="topbar"><h1>Reports</h1></div>
        <nav className="report-tabs" aria-label="Reports">
          {REPORTS.map((report) => (
            <Link
              key={report.kind}
              to={`/reports/${report.kind}`}
              className={kind === report.kind ? "active" : undefined}
            >
              {report.label}
            </Link>
          ))}
        </nav>
        <h2 className="report-title">{REPORTS.find((report) => report.kind === kind)?.label}</h2>

        <form className="master-data-filters report-filters" onSubmit={applyFilters}>
          {fieldsFor(kind).map((field) => (
            <label className="report-filter" key={field.key}>
              {field.label}
              {field.type === "select" ? (
                <select
                  aria-label={field.label}
                  value={draft[field.key] ?? ""}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                >
                  <option value="">All</option>
                  {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input
                  aria-label={field.label}
                  type={field.type === "date" ? "date" : "text"}
                  placeholder={field.type === "search" ? field.label : field.type ? undefined : "Enter ID"}
                  value={draft[field.key] ?? ""}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              )}
            </label>
          ))}
          <label className="report-filter">
            Sort
            <select aria-label="Sort report" value={draftSort} onChange={(event) => setDraftSort(event.target.value)}>
              {sortOptions(kind).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="report-filter">
            Rows per page
            <select aria-label="Rows per page" value={draftLimit} onChange={(event) => setDraftLimit(event.target.value)}>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
          <button type="submit">Apply filters</button>
        </form>

        {kind === "low-stock" && <p className="report-note">Stock status is fixed to LOW_STOCK by the backend.</p>}
        {filterError && <p className="master-data-error" role="alert">{filterError}</p>}
        {error && <p className="master-data-error" role="alert">{error} <button type="button" onClick={() => setReload((value) => value + 1)}>Retry</button></p>}

        {loading ? (
          <p role="status">Loading report...</p>
        ) : error ? null : rows.length === 0 ? (
          <p role="status">No report records match the selected filters.</p>
        ) : (
          <div className="report-table-wrap">
            <ReportTable kind={kind} rows={rows} />
          </div>
        )}

        {!error && (
          <div className="master-data-pagination">
            <span>Page {pagination.page} of {pageCount} ({pagination.totalItems} total)</span>
            <button type="button" onClick={() => changePage(Math.max(1, pagination.page - 1))} disabled={loading || pagination.page <= 1}>Previous</button>
            <button type="button" onClick={() => changePage(Math.min(pageCount, pagination.page + 1))} disabled={loading || pagination.page >= pageCount}>Next</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Reports() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const reportType = REPORTS.some((report) => report.kind === params.reportType)
    ? (params.reportType as ReportKind)
    : "inventory";
  return (
    <ReportView
      key={`${reportType}:${searchParams.toString()}`}
      kind={reportType}
    />
  );
}
