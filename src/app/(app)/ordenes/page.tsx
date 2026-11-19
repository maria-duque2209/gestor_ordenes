import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getUsuariosAsignables } from "@/lib/orders";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { AlertaEntrega } from "@/components/alerta-entrega";
import { formatFecha, hoyISO } from "@/lib/format";
import { DIAS_AVISO, ESTADOS_ACTIVOS } from "@/lib/estados";
import { ESTADO_LABEL, PRIORIDAD_LABEL, TIPO_PRODUCTO_LABEL } from "@/lib/labels";
import type { EstadoOrden, Order, Prioridad } from "@/lib/types";

export const metadata: Metadata = { title: "Órdenes" };

const POR_PAGINA = 50;

type Fila = Pick<Order, "id" | "numero" | "tipo_producto" | "descripcion" | "estado" | "prioridad" | "fecha_entrega"> & {
  cliente: { nombre: string } | null;
};

interface Filtros {
  q: string;
  estado: string;
  responsable: string;
  cliente: string;
  prioridad: string;
  desde: string;
  hasta: string;
  alerta: boolean;
  orden: "reciente" | "entrega";
  pagina: number;
}

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const fechaValida = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const limpiar = (q: string) => q.replace(/[,()*%\\:"]/g, " ").trim().slice(0, 100);

function leerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  return {
    q: limpiar(str(sp.q)),
    estado: str(sp.estado) || "activas",
    responsable: str(sp.responsable),
    cliente: limpiar(str(sp.cliente)),
    prioridad: str(sp.prioridad),
    desde: fechaValida(str(sp.desde)),
    hasta: fechaValida(str(sp.hasta)),
    alerta: str(sp.alerta) === "1",
    orden: str(sp.orden) === "entrega" ? "entrega" : "reciente",
    pagina: Math.max(1, Number(str(sp.pagina)) || 1),
  };
}

function sumarDias(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export default async function OrdenesPage({ searchParams }: PageProps<"/ordenes">) {
  const user = await getCurrentUser();
  const gestiona = user.rol === "admin" || user.rol === "ventas";
  const sp = await searchParams;
  const f = leerFiltros(sp);
  const usuarios = await getUsuariosAsignables();
  const responsableId = f.responsable === "yo" ? user.id : f.responsable;

  const supabase = await createClient();
  const embedCliente = f.cliente ? "cliente:clients!inner (nombre)" : "cliente:clients (nombre)";
  const embedResp = responsableId ? ", asig:order_assignees!inner (user_id)" : "";
  let query = supabase
    .from("orders")
    .select(`id, numero, tipo_producto, descripcion, estado, prioridad, fecha_entrega, ${embedCliente}${embedResp}`, {
      count: "exact",
    });

  if (f.q) {
    const n = Number(f.q.replace(/^op-?/i, ""));
    query = Number.isInteger(n) && n > 0 ? query.eq("numero_seq", n) : query.ilike("numero", `%${f.q}%`);
  }
  if (f.estado === "activas") query = query.in("estado", ESTADOS_ACTIVOS);
  else if (f.estado in ESTADO_LABEL) query = query.eq("estado", f.estado as EstadoOrden);
  if (responsableId) query = query.eq("asig.user_id", responsableId);
  if (f.cliente) query = query.ilike("cliente.nombre", `%${f.cliente}%`);
  if (f.prioridad in PRIORIDAD_LABEL) query = query.eq("prioridad", f.prioridad as Prioridad);
  if (f.desde) query = query.gte("fecha_entrega", f.desde);
  if (f.hasta) query = query.lte("fecha_entrega", f.hasta);
  if (f.alerta) {
    query = query.in("estado", ESTADOS_ACTIVOS).lte("fecha_entrega", sumarDias(hoyISO(), DIAS_AVISO));
  }

  query =
    f.orden === "entrega"
      ? query.order("fecha_entrega", { ascending: true, nullsFirst: false }).order("numero_seq", { ascending: false })
      : query.order("numero_seq", { ascending: false });

  const desde = (f.pagina - 1) * POR_PAGINA;
  const { data, count, error } = await query.range(desde, desde + POR_PAGINA - 1).returns<Fila[]>();
  if (error) throw new Error(error.message);
  const ordenes = data ?? [];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const hayFiltros =
    !!(f.q || f.responsable || f.cliente || f.prioridad || f.desde || f.hasta || f.alerta) || f.estado !== "activas";

  const urlPagina = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, alerta: f.alerta ? "1" : "", pagina: p > 1 ? String(p) : "" })) {
      if (v && !(k === "estado" && v === "activas") && !(k === "orden" && v === "reciente")) params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `/ordenes?${s}` : "/ordenes";
  };

  return (
    <>
      <PageHeader
        title="Órdenes"
        description={`${total} orden(es)${hayFiltros ? " con los filtros aplicados" : " activas"}`}
        actions={
          gestiona && (
            <Link href="/ordenes/nueva" className="btn-primary">
              Nueva orden
            </Link>
          )
        }
      />

      {sp.eliminada && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Orden eliminada.
        </p>
      )}

      <details className="card mb-4 group" open={hayFiltros || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
          <span>Filtros{hayFiltros && <span className="ml-2 rounded-full bg-navy-900 px-2 py-0.5 text-xs text-white">activos</span>}</span>
          <span className="text-slate-400 group-open:rotate-180">▾</span>
        </summary>
        <form action="/ordenes" className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Filtro label="Número" htmlFor="q">
            <input id="q" name="q" defaultValue={f.q} placeholder="OP-0012 o 12" className="input" inputMode="search" />
          </Filtro>
          <Filtro label="Estado" htmlFor="estado">
            <select id="estado" name="estado" defaultValue={f.estado} className="input">
              <option value="activas">Activas (sin entregadas ni canceladas)</option>
              <option value="todas">Todas</option>
              {Object.entries(ESTADO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Filtro>
          <Filtro label="Responsable" htmlFor="responsable">
            <select id="responsable" name="responsable" defaultValue={f.responsable} className="input">
              <option value="">Cualquiera</option>
              <option value="yo">Asignadas a mí</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre || u.email}
                </option>
              ))}
            </select>
          </Filtro>
          <Filtro label="Cliente" htmlFor="cliente">
            <input id="cliente" name="cliente" defaultValue={f.cliente} placeholder="Nombre del cliente" className="input" />
          </Filtro>
          <Filtro label="Prioridad" htmlFor="prioridad">
            <select id="prioridad" name="prioridad" defaultValue={f.prioridad} className="input">
              <option value="">Cualquiera</option>
              {Object.entries(PRIORIDAD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Filtro>
          <Filtro label="Entrega desde" htmlFor="desde">
            <input id="desde" name="desde" type="date" defaultValue={f.desde} className="input" />
          </Filtro>
          <Filtro label="Entrega hasta" htmlFor="hasta">
            <input id="hasta" name="hasta" type="date" defaultValue={f.hasta} className="input" />
          </Filtro>
          <Filtro label="Ordenar por" htmlFor="orden">
            <select id="orden" name="orden" defaultValue={f.orden} className="input">
              <option value="reciente">Más recientes</option>
              <option value="entrega">Fecha de entrega</option>
            </select>
          </Filtro>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="alerta" value="1" defaultChecked={f.alerta} className="h-4 w-4" />
            Solo atrasadas o con entrega en los próximos {DIAS_AVISO} días
          </label>
          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            <Link href="/ordenes" className="btn-secondary">
              Limpiar
            </Link>
            <button type="submit" className="btn-primary">
              Aplicar filtros
            </button>
          </div>
        </form>
      </details>

      {ordenes.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-500">
          {hayFiltros
            ? "No hay órdenes con estos filtros."
            : gestiona
              ? "No hay órdenes activas. Crea una con «Nueva orden»."
              : "No tienes órdenes activas asignadas."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="eyebrow border-b border-slate-100 bg-slate-50/60 text-left">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-brand-700">
                      <Link href={`/ordenes/${o.id}`} className="hover:underline">
                        {o.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.cliente?.nombre}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                      {TIPO_PRODUCTO_LABEL[o.tipo_producto]}
                      {o.descripcion ? ` · ${o.descripcion}` : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span>{formatFecha(o.fecha_entrega)}</span>
                        <AlertaEntrega orden={o} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PrioridadBadge prioridad={o.prioridad} />
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={o.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {ordenes.map((o) => (
              <li key={o.id}>
                <Link href={`/ordenes/${o.id}`} className="block space-y-1.5 px-4 py-3 active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium">{o.numero}</span>
                    <EstadoBadge estado={o.estado} />
                  </div>
                  <p className="truncate text-sm">{o.cliente?.nombre}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{TIPO_PRODUCTO_LABEL[o.tipo_producto]}</span>
                    <span>· Entrega {formatFecha(o.fecha_entrega)}</span>
                    <AlertaEntrega orden={o} />
                    {o.prioridad !== "normal" && <PrioridadBadge prioridad={o.prioridad} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          {f.pagina > 1 ? (
            <Link href={urlPagina(f.pagina - 1)} className="btn-secondary">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Página {f.pagina} de {paginas}
          </span>
          {f.pagina < paginas ? (
            <Link href={urlPagina(f.pagina + 1)} className="btn-secondary">
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

function Filtro({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}
