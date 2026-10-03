import {Link} from 'react-router'
import './users.css'
import { useState } from 'react'

export default function Users() {
    const [showForm, setShowForm] = useState(false)
   

    return (
        <div className="dashboard-wrapper">
           
            <aside className="sidebar">
                <div className="brand"></div>
                <nav>
                    <Link to="/dashboard"> Dashboard</Link>
                    <Link to="/inventory"> Inventory</Link>
                    <Link to="/products"> Products</Link>
                    <Link to="/transfers"> Transfers</Link>
                    <Link to="/warehouses"> Warehouses</Link>
                    <Link to="/users" className="active"> Users</Link>
                </nav>
                </aside>
            <main className="main-content">
                <div className="topbar">
                    <h1> Staff Accounts </h1>
                    <button className="invite-user-btn"
                     onClick={() => setShowForm(!showForm)}
                    >+ Invite User</button>
                </div>
                    {showForm && 
                    <div className="invite-user-form">
                        <h2> Invite User</h2>
                        <form>
                            <input type="text" placeholder="Name" />
                            <input type="email" placeholder="Email" />
                            <input type="tel" placeholder="Phone Number" />
                            <select>
                                <option>Warehouse Staff</option>
                                <option>Warehouse Manager</option>
                                <option>Administrator</option>
                            </select>
                            <button type="submit">Send Invite</button>
                            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                        </form>
                    </div>}
                    
                   
                <table className="activity-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Warehouse</th>
                            <th> Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>John Doe</td>
                            <td> Warehouse Staff</td>
                            <td> Lagos Main Store</td>
                            <td><span className="pill pill-ok">Active</span></td>
                        </tr>
                        <tr>
                            <td>Jane Smith</td>
                            <td> Warehouse Manager</td>
                            <td> Abuja Depot</td>
                            <td><span className="pill pill-ok">Active</span></td>
                        </tr>
                        <tr>
                            <td>Michael Johnson</td>
                            <td> Warehouse Staff</td>
                            <td> Port Harcourt Depot</td>
                            <td><span className="pill pill-danger">Deactivated</span></td>
                        </tr>
                    </tbody>
                </table>
            </main>
        </div>
    )
}
                       