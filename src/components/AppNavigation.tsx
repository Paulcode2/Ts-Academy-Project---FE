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
                location.pathname === item.to && activePath === item.to
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
