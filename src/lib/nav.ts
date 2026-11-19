import type { Rol } from "./types";

export type NavIcon = "home" | "orders" | "board" | "clients" | "history" | "users" | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  roles: Rol[];
}

/** Menú principal. La visibilidad por rol es solo de interfaz: la BD aplica RLS. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: "home", roles: ["admin", "ventas", "taller"] },
  { href: "/ordenes", label: "Órdenes", icon: "orders", roles: ["admin", "ventas", "taller"] },
  { href: "/tablero", label: "Tablero", icon: "board", roles: ["admin", "ventas", "taller"] },
  { href: "/clientes", label: "Clientes", icon: "clients", roles: ["admin", "ventas"] },
  { href: "/historial", label: "Historial", icon: "history", roles: ["admin", "ventas", "taller"] },
  { href: "/usuarios", label: "Usuarios", icon: "users", roles: ["admin"] },
  { href: "/configuracion", label: "Configuración", icon: "settings", roles: ["admin"] },
];

export function navForRole(rol: Rol): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(rol));
}
