import { useState } from "react";
import AppNavigation from "../../components/AppNavigation";
import { usePermissions } from "../../auth/usePermissions";
import "./warehouse.css";
export default function Warehouse() {
  const { isAdmin, assignedWarehouses, can } = usePermissions();
  const [warehouses, setWarehouses] = useState([
    {
      code: "LAG-01",
      name: "Lagos Main Store",
      locations: 2,
      status: "Active",
    },
    {
      code: "ABJ-01",
      name: "Abuja Branch",
      locations: 3,
      status: "Maintenance",
    },
    {
      code: "PH-01",
      name: "Port Harcourt Depot",
      locations: 1,
      status: "Inactive",
    },
  ]);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locations, setLocations] = useState("");
  const [status, setStatus] = useState("Active");

  const handleSaveWarehouse = () => {
    const newWarehouse = {
      code: code,
      name: name,
      locations: Number(locations),
      status: status,
    };

    setWarehouses([...warehouses, newWarehouse]);

    setCode("");
    setName("");
    setLocations("");
    setStatus("Active");
    setShowForm(false);
  };
  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/warehouses" />
      <main className="main-content">
        <div className="topbar">
          <h1> Warehouses</h1>
          {can("warehouses:manage") && (
            <button
              className="add-warehouse-btn"
              onClick={() => setShowForm(true)}
            >
              + Add Warehouse
            </button>
          )}
        </div>
        {isAdmin && showForm && (
          <div className="warehouse-form">
            <h2>Add Warehouse</h2>

            <input
              type="text"
              placeholder="Warehouse code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Warehouse name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="number"
              placeholder="Number of locations"
              name="locations"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              min="0"
              required
            />

            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button type="submit" onClick={handleSaveWarehouse}>
              Save Warehouse
            </button>

            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        )}
        {isAdmin ? (
          <table className="activity-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Locations</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.code}>
                  <td>{warehouse.code}</td>
                  <td>{warehouse.name}</td>
                  <td>{warehouse.locations}</td>
                  <td>
                    <span
                      className={
                        warehouse.status === "Active"
                          ? "pill pill-ok"
                          : warehouse.status === "Maintenance"
                            ? "pill pill-warn"
                            : "pill pill-danger"
                      }
                    >
                      {warehouse.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p role="status">
            Warehouse records are limited to backend-assigned scope.{" "}
            {assignedWarehouses.length === 0
              ? "No warehouse assignments are currently available."
              : "Scoped warehouse records have not been loaded yet."}
          </p>
        )}
      </main>
    </div>
  );
}
