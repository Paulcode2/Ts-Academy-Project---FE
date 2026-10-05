import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../auth/useAuth";
import { usePermissions } from "../auth/usePermissions";
import "./AppNavigation.css";

interface AppNavigationProps {
  activePath: string;
  showBrand?: boolean;
}

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", permission: "dashboard:read", icon: "grid" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory", permission: "warehouses:read", icon: "boxes" },
      { to: "/stock-movements", label: "Stock movements", permission: "warehouses:read", icon: "activity" },
      { to: "/stock-operations", label: "Stock operations", permission: "warehouses:read", icon: "arrows" },
      { to: "/transfers", label: "Transfers", permission: "transfers:read", icon: "transfer" },
    ],
  },
  {
    label: "Master data",
    items: [
      { to: "/warehouses", label: "Warehouses", permission: "warehouses:read", icon: "warehouse" },
      { to: "/locations", label: "Locations", permission: "locations:read", icon: "pin" },
      { to: "/categories", label: "Categories", permission: "categories:read", icon: "layers" },
      { to: "/products", label: "Products", permission: "products:read", icon: "tag" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports", label: "Reports", permission: "dashboard:read", icon: "chart" },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/users", label: "Staff accounts", permission: "users:manage", icon: "users" },
    ],
  },
] as const;

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "grid":
      return <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></svg>;
    case "boxes":
      return <svg {...common}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.8 7.5 4.4 7.5-4.4M12 12.2V21M8 5.2l8 4.5v4.5" /></svg>;
    case "activity":
      return <svg {...common}><path d="M3 12h4l2.3-7 4.4 14 2.3-7H21" /></svg>;
    case "arrows":
    case "transfer":
      return <svg {...common}><path d="M4 7h14l-3-3M20 17H6l3 3M18 7l-3 3M6 17l3-3" /></svg>;
    case "warehouse":
      return <svg {...common}><path d="m3 10 9-6 9 6v10H3V10Z" /><path d="M8 20v-6h8v6M7 10h.01M12 10h.01M17 10h.01" /></svg>;
    case "pin":
      return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "layers":
      return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" /></svg>;
    case "tag":
      return <svg {...common}><path d="M20 13 13 20 4 11V4h7l9 9Z" /><circle cx="8" cy="8" r="1" /></svg>;
    case "chart":
      return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
    default:
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></svg>;
  }
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/inventory")) return "Inventory";
  if (pathname.startsWith("/stock-operations")) return "Stock operations";
  if (pathname.startsWith("/stock-movements")) return "Stock movements";
  if (pathname.startsWith("/warehouses")) return "Warehouses";
  if (pathname.startsWith("/locations")) return "Locations";
  if (pathname.startsWith("/categories")) return "Categories";
  if (pathname.startsWith("/products")) return "Products";
  if (pathname.startsWith("/transfers")) return "Transfers";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/users")) return "Staff accounts";
  return "Dashboard";
}

export default function AppNavigation({
  activePath,
  showBrand = true,
}: AppNavigationProps) {
  const { can } = usePermissions();
  const { currentUser, role, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const fullName = [currentUser?.firstName, currentUser?.lastName]
    .filter(Boolean)
    .join(" ");
  const initials = [currentUser?.firstName?.[0], currentUser?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  async function signOut() {
    setLogoutError("");
    try {
      await logout();
    } catch {
      setLogoutError("Sign-out could not reach the server. Your local session has been cleared.");
    }
  }

  return (
    <>
      <header className="app-header">
        <button
          className="mobile-nav-toggle"
          type="button"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <Link className="app-brand" to="/dashboard" aria-label="Warehouse operations home">
          <span className="app-brand-mark" aria-hidden="true">W</span>
          <span className="app-brand-copy">
            <strong>WAREHOUSE</strong>
            <small>OPERATIONS</small>
          </span>
        </Link>
        <div className="header-context">
          <span className="header-context-eyebrow">Workspace</span>
          <span className="header-context-title">{pageTitle(location.pathname)}</span>
        </div>
        <div className="header-account">
          <span className="account-avatar" aria-hidden="true">{initials || "U"}</span>
          <span className="account-copy">
            <strong>{fullName || currentUser?.email || "Account"}</strong>
            <small>{role ?? "Authenticated user"}</small>
          </span>
          <button className="sign-out-button" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        {logoutError && <p className="shell-alert" role="alert">{logoutError}</p>}
      </header>
      <aside
        className={`sidebar${mobileOpen ? " sidebar-open" : ""}`}
        id="primary-navigation"
        aria-label="Primary navigation"
      >
        {showBrand && (
          <div className="sidebar-workspace">
            <span className="workspace-indicator" aria-hidden="true" />
            <span><strong>Operations</strong><small>Management workspace</small></span>
          </div>
        )}
        <nav>
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) => can(item.permission));
            if (!visibleItems.length) return null;
            return (
              <div className="nav-group" key={group.label}>
                <h2>{group.label}</h2>
                {visibleItems.map((item) => {
                  const selected =
                    (location.pathname === item.to ||
                      (item.to !== "/dashboard" &&
                        location.pathname.startsWith(`${item.to}/`))) &&
                    activePath === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`nav-link${selected ? " active" : ""}`}
                      aria-current={selected ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      <NavIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-footer-mark" aria-hidden="true">●</span>
          <span>Inventory workspace</span>
        </div>
      </aside>
    </>
  );
}
