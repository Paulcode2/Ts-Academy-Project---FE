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
