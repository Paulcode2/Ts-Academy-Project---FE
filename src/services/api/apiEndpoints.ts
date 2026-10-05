export const API_ENDPOINTS = {
  health: "/health",
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
    changePassword: "/auth/change-password",
  },
  masterData: {
    warehouses: "/warehouses",
    locations: "/locations",
    categories: "/categories",
    products: "/products",
  },
  inventory: {
    list: "/inventory",
    lowStock: "/inventory/low-stock",
    outOfStock: "/inventory/out-of-stock",
  },
  stockMovements: {
    list: "/stock-movements",
    stockIn: "/stock-movements/stock-in",
    stockOut: "/stock-movements/stock-out",
    adjust: "/stock-movements/adjust",
  },
  users: {
    list: "/users",
  },
} as const;
