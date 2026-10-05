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

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat-card">
      <b>{value.toLocaleString()}</b>
      <span>{label}</span>
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
    void dashboardService
      .getSummary()
      .then((result) => {
        if (!active) return;
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
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/dashboard" />
      <main className="main-content">
        <div className="topbar">
          <h1>Dashboard</h1>
          <div className="dashboard-controls">
            {summary && <span className="role-badge">{summary.role}</span>}
            <button type="button" onClick={refresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && <p role="status">Loading dashboard summary...</p>}
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
              <StatCard value={summary.totals.warehouses} label="Warehouses" />
              <StatCard value={summary.totals.locations} label="Locations" />
              <StatCard value={summary.totals.activeProducts} label="Active products" />
              <StatCard value={summary.totals.inventoryUnits} label="Inventory units" />
              <StatCard value={summary.totals.lowStockProducts} label="Low-stock products" />
              <StatCard value={summary.totals.outOfStockProducts} label="Out-of-stock products" />
              <StatCard value={summary.totals.pendingTransfers} label="Pending transfers" />
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
                        <td>{movement.movementType}</td>
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
                        <td>{transfer.status}</td>
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
