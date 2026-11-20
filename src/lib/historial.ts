import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";
import type { EstadoOrden, Order, OrderPricing } from "@/lib/types";

/** Estados que se consideran «cerrados» para el historial. */
export const ESTADOS_HISTORIAL = ["terminada", "entregada", "cancelada"] as const satisfies readonly EstadoOrden[];

export type FiltroEstadoHistorial = "terminada_entregada" | "todas" | (typeof ESTADOS_HISTORIAL)[number];

export interface FiltrosHistorial {
  q: string;
  cliente: string;
  estado: FiltroEstadoHistorial;
  desde: string;
  hasta: string;
  pagina: number;
}

export type FilaHistorial = Pick<
  Order,
  "id" | "numero" | "tipo_producto" | "descripcion" | "estado" | "prioridad" | "fecha_entrega" | "created_at" | "updated_at"
> & {
  cliente: { nombre: string; documento: string | null } | null;
  precio?: Pick<OrderPricing, "precio" | "anticipo" | "saldo"> | null;
};

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const fechaValida = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const limpiar = (q: string) => q.replace(/[,()*%\\:"]/g, " ").trim().slice(0, 100);

export function leerFiltrosHistorial(sp: Record<string, string | string[] | undefined>): FiltrosHistorial {
  const estado = str(sp.estado);
  return {
    q: limpiar(str(sp.q)),
    cliente: limpiar(str(sp.cliente)),
    estado: (["todas", ...ESTADOS_HISTORIAL] as string[]).includes(estado)
      ? (estado as FiltroEstadoHistorial)
      : "terminada_entregada",
    desde: fechaValida(str(sp.desde)),
    hasta: fechaValida(str(sp.hasta)),
    pagina: Math.max(1, Number(str(sp.pagina)) || 1),
  };
}

export function hayFiltrosHistorial(f: FiltrosHistorial) {
  return !!(f.q || f.cliente || f.desde || f.hasta) || f.estado !== "terminada_entregada";
}

/** Query string de los filtros (sin la página), para enlaces y exportación. */
export function queryHistorial(f: FiltrosHistorial, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.cliente) p.set("cliente", f.cliente);
  if (f.estado !== "terminada_entregada") p.set("estado", f.estado);
  if (f.desde) p.set("desde", f.desde);
  if (f.hasta) p.set("hasta", f.hasta);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/**
 * Órdenes cerradas según los filtros. RLS limita lo que ve cada rol;
 * los precios solo se piden para admin y ventas.
 */
export async function buscarHistorial(
  f: FiltrosHistorial,
  user: CurrentUser,
  rango: { desde: number; hasta: number },
) {
  const conPrecio = user.rol === "admin" || user.rol === "ventas";
  const embedCliente = f.cliente ? "cliente:clients!inner (nombre, documento)" : "cliente:clients (nombre, documento)";
  const embedPrecio = conPrecio ? ", precio:order_pricing (precio, anticipo, saldo)" : "";

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      `id, numero, tipo_producto, descripcion, estado, prioridad, fecha_entrega, created_at, updated_at, ${embedCliente}${embedPrecio}`,
      { count: "exact" },
    );

  if (f.estado === "terminada_entregada") query = query.in("estado", ["terminada", "entregada"]);
  else if (f.estado === "todas") query = query.in("estado", [...ESTADOS_HISTORIAL]);
  else query = query.eq("estado", f.estado);

  if (f.q) {
    const n = Number(f.q.replace(/^op-?/i, ""));
    query = Number.isInteger(n) && n > 0 ? query.eq("numero_seq", n) : query.ilike("numero", `%${f.q}%`);
  }
  if (f.cliente) query = query.ilike("cliente.nombre", `%${f.cliente}%`);
  if (f.desde) query = query.gte("fecha_entrega", f.desde);
  if (f.hasta) query = query.lte("fecha_entrega", f.hasta);

  const { data, count, error } = await query
    .order("fecha_entrega", { ascending: false, nullsFirst: false })
    .order("numero_seq", { ascending: false })
    .range(rango.desde, rango.hasta)
    .returns<FilaHistorial[]>();

  if (error) throw new Error(`No se pudo cargar el historial: ${error.message}`);
  return { filas: data ?? [], total: count ?? 0, conPrecio };
}
