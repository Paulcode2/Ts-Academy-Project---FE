import { Navigate, Route, Routes } from "react-router";
import "./App.css";
import Login from "./pages/login/login";
import Dashboard from "./pages/dashboard/dashboard";
import Warehouse from "./pages/Warehouses/warehouse";
import Transfers from "./pages/transfers/transfers";
import Users from "./pages/users/users";
import ProtectedRoute from "./pages/ProtectedRoute";
import Locations from "./pages/locations/locations";
import Categories from "./pages/categories/categories";
import Products from "./pages/products/products";
import Inventory from "./pages/inventory/inventory";
import StockOperationsPage from "./pages/inventory/StockOperationsPage";
import StockMovementsPage from "./pages/inventory/StockMovementsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/warehouses"
        element={
          <ProtectedRoute>
            <Warehouse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute>
            <Locations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/low-stock"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/out-of-stock"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/:inventoryId"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-operations"
        element={
          <ProtectedRoute>
            <StockOperationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-operations/stock-in"
        element={
          <ProtectedRoute>
            <StockOperationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-operations/stock-out"
        element={
          <ProtectedRoute>
            <StockOperationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-operations/adjust"
        element={
          <ProtectedRoute>
            <StockOperationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-movements"
        element={
          <ProtectedRoute>
            <StockMovementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock-movements/:movementId"
        element={
          <ProtectedRoute>
            <StockMovementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfers"
        element={
          <ProtectedRoute>
            <Transfers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfers/:transferId"
        element={
          <ProtectedRoute>
            <Transfers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Users />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
