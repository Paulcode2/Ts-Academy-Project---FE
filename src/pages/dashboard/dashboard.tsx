import { useEffect, useState } from "react";
import { ApiError } from "../../services/api/apiClient";
import {
  dashboardService,
  type DashboardEntity,
  type DashboardSummary,
} from "../../services/dashboard/dashboardService";
import AppNavigation from "../../components/AppNavigation";
import "./dashboard.css";

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "The dashboard summary could not be loaded. Please try again.";
  }
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 403) return "You do not have permission to view the dashboard.";
  if (error.status === 503) return "The dashboard service is temporarily unavailable.";
  if (error.status !== null && error.status >= 500) {
    return "The server could not load the dashboard summary.";
  }
  return error.message;
}

function entityName(entity: DashboardEntity | null | undefined): string {
  return entity?.name ?? "—";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function MetricIcon({ kind }: { kind: string }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (kind === "warehouses") {
    return <svg {...iconProps}><path d="m3 10 9-6 9 6v10H3V10Z" /><path d="M8 20v-6h8v6M7 10h.01M12 10h.01M17 10h.01" /></svg>;
  }
  if (kind === "products") {
    return <svg {...iconProps}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21" /></svg>;
  }
  if (kind === "stock") {
    return <svg {...iconProps}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /><circle cx="10" cy="18" r="1.5" fill="currentColor" /></svg>;
  }
  if (kind === "transfers") {
    return <svg {...iconProps}><path d="M4 7h14l-3-3M20 17H6l3 3M18 7l-3 3M6 17l3-3" /></svg>;
  }
  return <svg {...iconProps}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
}

function StatCard({
  value,
  label,
  kind,
}: {
  value: number;
  label: string;
  kind: string;
}) {
  return (
    <div className="stat-card">
      <span className={`stat-icon stat-icon-${kind}`}><MetricIcon kind={kind} /></span>
      <div>
        <span className="stat-label">{label}</span>
        <b>{value.toLocaleString()}</b>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const request = Promise.resolve().then(() => {
      if (!active) return null;
      setLoading(true);
      setError("");
      return dashboardService.getSummary();
    });
    void request
      .then((result) => {
        if (!active || !result) return;
        setSummary(result);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setSummary(null);
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  function refresh() {
    setSummary(null);
    setError("");
    setLoading(true);
    setReload((value) => value + 1);
  }

  return (
    <div className="dashboard-wrapper dashboard-page">
      <AppNavigation activePath="/dashboard" />
      <main className="main-content dashboard-content">
        <div className="topbar">
          <div className="dashboard-heading">
            <p className="dashboard-eyebrow">OVERVIEW</p>
            <h1>Dashboard</h1>
            <p className="dashboard-description">A live view of your warehouse operations.</p>
          </div>
          <div className="dashboard-controls">
            {summary && <span className="role-badge">{summary.role}</span>}
            <button type="button" onClick={refresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="dashboard-loading" role="status">
            <span className="dashboard-spinner" aria-hidden="true" />
            Loading dashboard summary...
          </div>
        )}
        {error && (
          <div className="dashboard-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={refresh} disabled={loading}>
              Retry
            </button>
          </div>
        )}

        {summary && !loading && (
          <>
            <div className="stat-row">
              <StatCard value={summary.totals.warehouses} label="Warehouses" kind="warehouses" />
              <StatCard value={summary.totals.locations} label="Locations" kind="locations" />
              <StatCard value={summary.totals.activeProducts} label="Active products" kind="products" />
              <StatCard value={summary.totals.inventoryUnits} label="Inventory units" kind="stock" />
              <StatCard value={summary.totals.lowStockProducts} label="Low-stock products" kind="low" />
              <StatCard value={summary.totals.outOfStockProducts} label="Out-of-stock products" kind="out" />
              <StatCard value={summary.totals.pendingTransfers} label="Pending transfers" kind="transfers" />
            </div>

            <section className="dashboard-section">
              <h2>Recent stock movements</h2>
              {summary.recentStockMovements.length === 0 ? (
                <p role="status">No recent stock movements.</p>
              ) : (
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Movement</th>
                      <th>Product</th>
                      <th>Warehouse / location</th>
                      <th>Quantity</th>
                      <th>Previous / new</th>
                      <th>Reference</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentStockMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td><span className={`activity-type activity-type-${movement.movementType.toLowerCase().replaceAll("_", "-")}`}>{movement.movementType.replaceAll("_", " ")}</span></td>
                        <td>
                          {entityName(movement.product)}
                          {movement.product.sku ? ` (${movement.product.sku})` : ""}
                        </td>
                        <td>
                          {entityName(movement.warehouse)} / {entityName(movement.location)}
                        </td>
                        <td>{movement.quantity}</td>
                        <td>{movement.previousQuantity} / {movement.newQuantity}</td>
                        <td>{movement.reference || "—"}</td>
                        <td>{formatDate(movement.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="dashboard-section">
              <h2>Recent transfers</h2>
              {summary.recentTransfers.length === 0 ? (
                <p role="status">No recent transfers.</p>
              ) : (
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Source</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentTransfers.map((transfer) => (
                      <tr key={transfer.id}>
                        <td>{transfer.reference}</td>
                        <td>{entityName(transfer.product)}</td>
                        <td>{transfer.quantity}</td>
                        <td>{entityName(transfer.sourceWarehouse)} / {entityName(transfer.sourceLocation)}</td>
                        <td>{entityName(transfer.destinationWarehouse)} / {entityName(transfer.destinationLocation)}</td>
                        <td><span className={`status-badge status-${transfer.status.toLowerCase()}`}>{transfer.status}</span></td>
                        <td>{formatDate(transfer.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="dashboard-section">
              <h2>Inventory by warehouse</h2>
              {summary.inventoryByWarehouse.length === 0 ? (
                <p role="status">No warehouse inventory summaries are available.</p>
              ) : (
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Inventory units</th>
                      <th>Inventory records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.inventoryByWarehouse.map((warehouse) => (
                      <tr key={warehouse.warehouse.id}>
                        <td>
                          {entityName(warehouse.warehouse)}
                          {warehouse.warehouse.code ? ` (${warehouse.warehouse.code})` : ""}
                        </td>
                        <td>{warehouse.totalInventoryUnits}</td>
                        <td>{warehouse.inventoryRecordCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
