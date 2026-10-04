import { useState } from "react";
import AppNavigation from "../../components/AppNavigation";
import { usePermissions } from "../../auth/usePermissions";
import "./transfers.css";
export default function Transfers() {
  const { role, isAdmin, can } = usePermissions();
  const [transfers, setTransfers] = useState([
    {
      product: "GOSLO-CHOCOLATE-ALMOND-320ML",
      qty: 40,
      from: "Shelf A1",
      to: "Shelf C3",
      requestedBy: "B. Adewale",
      status: "pending",
    },
    {
      product: "FANICE-VANILLA-3L",
      qty: 15,
      from: "Shelf A2",
      to: "Shelf B2",
      requestedBy: "F. Ibrahim",
      status: "pending",
    },
  ]);
  const handleApprove = (index: number) => {
    const updatedTransfers = [...transfers];
    updatedTransfers[index].status = "approved";
    setTransfers(updatedTransfers);
  };
  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath="/transfers" showBrand={false} />
      <main className="main-content">
        <div className="topbar">
          <h1> Transfers</h1>
          <span className="pill pill-warn">{role}</span>
        </div>
        {isAdmin ? (
          <table className="activity-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>From to</th>
                <th>Requested By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer, index) => (
                <tr key={index}>
                  <td>{transfer.product}</td>
                  <td>{transfer.qty}</td>
                  <td>
                    {transfer.from} to {transfer.to}
                  </td>
                  <td>{transfer.requestedBy}</td>
                  <td>
                    <span
                      className={`pill ${transfer.status === "approved" ? "pill-ok" : "pill-warn"}`}
                    >
                      {transfer.status === "approved" ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td>
                    {can("transfers:review") &&
                      transfer.status === "pending" && (
                        <button
                          className="btn-primary"
                          onClick={() => handleApprove(index)}
                        >
                          Approve
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p role="status">
            Transfers will be shown only for warehouses and actions returned or
            authorized by the backend. Scoped transfer data is not connected
            yet.
          </p>
        )}
      </main>
    </div>
  );
}
