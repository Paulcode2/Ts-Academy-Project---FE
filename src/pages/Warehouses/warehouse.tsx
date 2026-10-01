import { Link } from 'react-router'
import { useState } from 'react'
import './warehouse.css'
export default function Warehouse() {
    const [warehouses, setWarehouses] = useState([
        { code: 'LAG-01', name: 'Lagos Main Store', locations: 2, status: 'Active' },
        { code: 'ABJ-01', name: 'Abuja Branch', locations: 3, status: 'Maintenance' },
        { code: 'PH-01', name: 'Port Harcourt Depot', locations: 1, status: 'Inactive' }
    ]);
const [showForm, setShowForm] = useState(false)

    return(
        <div className="dashboard-wrapper">
            {/* |Sidebar - same as dashboard,just "warehouses" is active| */}
            <aside className="sidebar">
                <div className="brand"></div>
                <nav>   
                    <Link to="/dashboard"> Dashboard</Link>
                    <Link to="/inventory"> Inventory</Link>
                    <Link to="/products"> Products</Link>
                    <Link to="/transfers"> Transfers</Link>
                    <Link to="/warehouses" className="active"> Warehouses</Link>
                    <Link to="/users"> Users</Link>
                </nav>
            </aside>
            <main className="main-content">
                <div className="topbar">
                    <h1> Warehouses</h1>
                    <button className="add-warehouse-btn"    onClick={() => setShowForm(true)}>+ Add warehouse</button>
                </div>
                {showForm && (
    <div className="warehouse-form">
        <h2>Add Warehouse</h2>

        <input
            type="text"
            placeholder="Warehouse code"
        />

        <input
            type="text"
            placeholder="Warehouse name"
        />

        <input
            type="number"
            placeholder="Number of locations"
        />

        <select>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
        </select>

        <button>Save Warehouse</button>

        <button onClick={() => setShowForm(false)}>
            Cancel
        </button>
    </div>
)}
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
                        {warehouses.map((warehouses) => (
                            <tr key={warehouses.code}>
                                <td>{warehouses.code}</td>
                                <td>{warehouses.name}</td>
                                <td>{warehouses.locations}</td>
                                <td><span className={
                                    warehouses.status === 'Active' ? 'pill pill-ok' : 
                                    warehouses.status === 'Maintenance' ? 'pill pill-warn' : 'pill pill-danger'
                                }>
                                    {warehouses.status}
                                </span></td>
                            </tr>
                        ))}
                        
                        <td>
                            <span className= {
                                warehouses.status === 'Active' ? 'pill pill-ok' : 
                                warehouses.status === 'Maintenance' ? 'pill pill-warn' : 'pill pill-danger'
                            }>
                                {warehouses.status}
                            </span>
                        </td>
                    </tbody>
                </table>
            </main>
        </div>
    );
}