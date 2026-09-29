import './dashboard.css'

export default function Dashboard() {
    return(
        <div className="dashboard-wrapper">
        
            <aside className="sidebar">
                <div className="brand"></div>
                <nav>
                    <a  href="dashboard.html" className="active"> Dashboard</a>
                    <a href="inventory.html"> Inventory</a>
                    <a href="products.html"> Products</a>
                    <a href="transfers.html"> Transfers</a>
                    <a href="warehouses.html"> Warehouses</a>
                    <a href="users.html"> Users</a>
                </nav>
            </aside>

           
            <main className="main-content">
                <div className="topbar">
                    <h1> Dashboard</h1>
                    <span className="role-badge"> Admin</span>
                </div>

              
            </main>
        </div>
    )
}

















