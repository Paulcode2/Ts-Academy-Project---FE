import "./dashboard.css";
import AppNavigation from "../../components/AppNavigation";
import { usePermissions } from "../../auth/usePermissions";
export default function Dashboard() {
  const { role, isAdmin } = usePermissions();
  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/dashboard" />

      <main className="main-content">
        <div className="topbar">
          <h1> Dashboard</h1>
          <span className="role-badge">{role}</span>
        </div>
        {isAdmin ? (
          <>
            <div className="stat-row">
              <div className="stat-card">
                <b>12</b>
                <span>Warehouses</span>
              </div>
              <div className="stat-card">
                <b>348</b>
                <span>Products</span>
              </div>
              <div className="stat-card">
                <b>7</b>
                <span>Low stock</span>
              </div>
              <div className="stat-card">
                <b>3</b>
                <span>Pending transfers</span>
              </div>
            </div>

            <table className="activity-table">
              <thead>
                <tr>
                  <th>Movement</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Stock-in</td>
                  <td>GOSLO-CHOCOLATE-ALMOND-320ML</td>
                  <td>+120</td>
                  <td>
                    <span className="pill pill-ok">Done</span>
                  </td>
                </tr>
                <tr>
                  <td>Transfer</td>
                  <td>FANICE-VANILLA-3L</td>
                  <td>15</td>
                  <td>
                    <span className="pill pill-warn">Pending</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p role="status">
            Dashboard information is limited to warehouses assigned by the
            backend. Scoped dashboard data is not connected yet.
          </p>
        )}
      </main>
    </div>
  );
}
