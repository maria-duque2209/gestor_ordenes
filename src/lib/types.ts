export type Rol = "admin" | "ventas" | "taller";
export type TipoProducto = "subwoofer" | "altavoz" | "otro";
export type EstadoOrden =
  | "pendiente"
  | "en_produccion"
  | "control_calidad"
  | "terminada"
  | "entregada"
  | "cancelada";
export type Prioridad = "baja" | "normal" | "alta" | "urgente";
export type Unidad = "cm" | "mm" | "in";

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  created_at: string;
}

/** Especificaciones técnicas habituales; se guardan en orders.especificaciones (JSONB). */
export interface Especificaciones {
  potencia?: string;
  impedancia?: string;
  tamano_driver?: string;
  tipo_caja?: string;
  [clave: string]: string | undefined;
}

export interface Order {
  id: string;
  numero_seq: number;
  numero: string;
  client_id: string;
  tipo_producto: TipoProducto;
  descripcion: string | null;
  alto: number | null;
  ancho: number | null;
  profundidad: number | null;
  unidad: Unidad;
  color: string | null;
  material: string | null;
  especificaciones: Especificaciones;
  notas_especificaciones: string | null;
  estado: EstadoOrden;
  prioridad: Prioridad;
  fecha_inicio: string | null;
  fecha_entrega: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Solo visible para admin y ventas (tabla order_pricing). */
export interface OrderPricing {
  order_id: string;
  precio: number;
  anticipo: number;
  saldo: number;
  updated_at: string;
  updated_by: string | null;
}

export interface OrderPhoto {
  id: string;
  order_id: string;
  storage_path: string;
  descripcion: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface OrderNote {
  id: string;
  order_id: string;
  user_id: string | null;
  texto: string;
  created_at: string;
}

export interface OrderHistory {
  id: number;
  order_id: string;
  user_id: string | null;
  accion: string;
  cambio: Record<string, unknown>;
  created_at: string;
}
