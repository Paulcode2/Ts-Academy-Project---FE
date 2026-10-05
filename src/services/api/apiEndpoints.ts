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
  users: {
    list: "/users",
  },
} as const;
