import './dashboard.css'
import {Link} from 'react-router'
export default function Dashboard() {
    return(
        <div className="dashboard-wrapper">
        
            <aside className="sidebar">
                <div className="brand"></div>
                <nav>
                    <Link to="/dashboard" className="active">Dashboard</Link>
                    <Link to="/inventory">Inventory</Link>
                    <Link to="/products">Products</Link>
                    <Link to="/transfers">Transfers</Link>
                    <Link to="/warehouses">Warehouses</Link>
                    <Link to="/users">Users</Link>
                </nav>
            </aside>

           
            <main className="main-content">
                <div className="topbar">
                    <h1> Dashboard</h1>
                    <span className="role-badge"> Admin</span>
                </div>
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
      <td><span className="pill pill-ok">Done</span></td>
    </tr>
    <tr>
      <td>Transfer</td>
      <td>FANICE-VANILLA-3L</td>
      <td>15</td>
      <td><span className="pill pill-warn">Pending</span></td>
    </tr>
  </tbody>
  </table>

              
            </main>
        </div>
    )
}

















