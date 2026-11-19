import type { EstadoOrden, Prioridad, Rol, TipoProducto, Unidad } from "./types";

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador",
  ventas: "Ventas",
  taller: "Taller",
};

export const ESTADO_LABEL: Record<EstadoOrden, string> = {
  pendiente: "Pendiente",
  en_produccion: "En producción",
  control_calidad: "Control de calidad",
  terminada: "Terminada",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export const TIPO_PRODUCTO_LABEL: Record<TipoProducto, string> = {
  subwoofer: "Subwoofer",
  altavoz: "Altavoz",
  otro: "Otro",
};

export const UNIDAD_LABEL: Record<Unidad, string> = {
  cm: "cm",
  mm: "mm",
  in: "pulgadas",
};
