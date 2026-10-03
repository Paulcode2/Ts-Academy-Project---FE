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

const [code, setCode] = useState('')
const [name, setName] = useState('')
const [locations, setLocations] = useState('')
const [status, setStatus] = useState('Active')

const handleSaveWarehouse = () => {
    const newWarehouse = {
        code: code,
        name: name,
        locations: Number(locations),
        status: status
    }

    setWarehouses([...warehouses, newWarehouse])

    setCode('')
    setName('')
    setLocations('')
    setStatus('Active')
    setShowForm(false)
}
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
                    <button className="add-warehouse-btn"    onClick={() => setShowForm(true)}>+ Add Warehouse</button>
                </div>
                {showForm && (
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
                                            warehouse.status === 'Active'
                                                ? 'pill pill-ok'
                                                : warehouse.status === 'Maintenance'
                                                    ? 'pill pill-warn'
                                                    : 'pill pill-danger'
                                        }
                                    >
                                        {warehouse.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        
                    </tbody>
                </table>
            </main>
        </div>
    );
}