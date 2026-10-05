import { Link, useLocation } from "react-router";
import { usePermissions } from "../auth/usePermissions";

interface AppNavigationProps {
  activePath: string;
  showBrand?: boolean;
}

const navigationItems = [
  { to: "/dashboard", label: "Dashboard", permission: "dashboard:read" },
  { to: "/transfers", label: "Transfers", permission: "transfers:read" },
  { to: "/warehouses", label: "Warehouses", permission: "warehouses:read" },
  { to: "/locations", label: "Locations", permission: "locations:read" },
  { to: "/categories", label: "Categories", permission: "categories:read" },
  { to: "/products", label: "Products", permission: "products:read" },
  { to: "/inventory", label: "Inventory", permission: "warehouses:read" },
  { to: "/users", label: "Users", permission: "users:manage" },
] as const;

export default function AppNavigation({
  activePath,
  showBrand = true,
}: AppNavigationProps) {
  const { can } = usePermissions();
  const location = useLocation();

  return (
    <aside className="sidebar">
      {showBrand && <div className="brand"></div>}
      <nav>
        {navigationItems
          .filter((item) => can(item.permission))
          .map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                (location.pathname === item.to ||
                  (item.to === "/inventory" &&
                    location.pathname.startsWith("/inventory/"))) &&
                activePath === item.to
                  ? "active"
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}
