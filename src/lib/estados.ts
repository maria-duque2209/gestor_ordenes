import { diasHasta } from "./format";
import type { EstadoOrden, Rol } from "./types";

/** Orden del flujo de producción (columnas del tablero). */
export const FLUJO: EstadoOrden[] = ["pendiente", "en_produccion", "control_calidad", "terminada", "entregada"];

export const ESTADOS_ACTIVOS: EstadoOrden[] = ["pendiente", "en_produccion", "control_calidad", "terminada"];

export const ESTADOS_CERRADOS: EstadoOrden[] = ["entregada", "cancelada"];

/** Estados a los que el rol puede mover una orden (la BD lo vuelve a comprobar). */
export function estadosPermitidos(rol: Rol, actual: EstadoOrden): EstadoOrden[] {
  if (rol === "admin") return [...FLUJO, "cancelada"].filter((e) => e !== actual) as EstadoOrden[];
  if (actual === "cancelada") return []; // solo admin reabre
  return FLUJO.filter((e) => e !== actual);
}

export function siguienteEstado(actual: EstadoOrden): EstadoOrden | null {
  const i = FLUJO.indexOf(actual);
  return i >= 0 && i < FLUJO.length - 1 ? FLUJO[i + 1] : null;
}

export type Alerta = "atrasada" | "hoy" | "proxima";

/** Días de antelación para avisar de una entrega próxima. */
export const DIAS_AVISO = 3;

/** Alerta de entrega para órdenes que aún no se han entregado (terminada incluida: falta entregar). */
export function alertaEntrega(o: { estado: EstadoOrden; fecha_entrega: string | null }): {
  tipo: Alerta;
  dias: number;
} | null {
  if (!o.fecha_entrega || ESTADOS_CERRADOS.includes(o.estado)) return null;
  const dias = diasHasta(o.fecha_entrega);
  if (dias < 0) return { tipo: "atrasada", dias };
  if (dias === 0) return { tipo: "hoy", dias };
  if (dias <= DIAS_AVISO) return { tipo: "proxima", dias };
  return null;
}

export function textoAlerta(a: { tipo: Alerta; dias: number }): string {
  if (a.tipo === "atrasada") return a.dias === -1 ? "Atrasada 1 día" : `Atrasada ${-a.dias} días`;
  if (a.tipo === "hoy") return "Entrega hoy";
  return a.dias === 1 ? "Entrega mañana" : `Entrega en ${a.dias} días`;
}
