import type { Rol } from "./types";

export type NavIcon = "home" | "orders" | "board" | "clients" | "history" | "users" | "settings";

export type NavSection = "operacion" | "administracion";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  roles: Rol[];
  section: NavSection;
}

export const NAV_SECTION_LABEL: Record<NavSection, string> = {
  operacion: "Operación",
  administracion: "Administración",
};

/** Menú principal. La visibilidad por rol es solo de interfaz: la BD aplica RLS. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Panel", icon: "home", roles: ["admin", "ventas", "taller"], section: "operacion" },
  { href: "/ordenes", label: "Órdenes", icon: "orders", roles: ["admin", "ventas", "taller"], section: "operacion" },
  { href: "/tablero", label: "Tablero", icon: "board", roles: ["admin", "ventas", "taller"], section: "operacion" },
  { href: "/clientes", label: "Clientes", icon: "clients", roles: ["admin", "ventas"], section: "operacion" },
  { href: "/historial", label: "Historial", icon: "history", roles: ["admin", "ventas", "taller"], section: "operacion" },
  { href: "/usuarios", label: "Usuarios", icon: "users", roles: ["admin"], section: "administracion" },
  { href: "/configuracion", label: "Configuración", icon: "settings", roles: ["admin"], section: "administracion" },
];

export function navForRole(rol: Rol): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(rol));
}
