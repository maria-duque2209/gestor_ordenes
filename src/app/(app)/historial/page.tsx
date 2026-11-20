import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { buscarHistorial, hayFiltrosHistorial, leerFiltrosHistorial, queryHistorial } from "@/lib/historial";
import { formatFecha, formatFechaHora, formatMoneda } from "@/lib/format";
import { ESTADO_LABEL, TIPO_PRODUCTO_LABEL } from "@/lib/labels";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/badges";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Historial" };

const POR_PAGINA = 50;

export default async function HistorialPage({ searchParams }: PageProps<"/historial">) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const f = leerFiltrosHistorial(sp);
  const inicio = (f.pagina - 1) * POR_PAGINA;
  const { filas, total, conPrecio } = await buscarHistorial(f, user, { desde: inicio, hasta: inicio + POR_PAGINA - 1 });
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hayFiltros = hayFiltrosHistorial(f);
  const urlPagina = (p: number) => `/historial${queryHistorial(f, p > 1 ? { pagina: String(p) } : {})}`;

  return (
    <>
      <PageHeader
        title="Historial"
        description={`${total} orden(es) ${hayFiltros ? "con los filtros aplicados" : "terminadas o entregadas"}`}
        actions={
          total > 0 && (
            <a href={`/historial/exportar${queryHistorial(f)}`} className="btn-secondary" download>
              <Icon name="history" className="h-4 w-4" />
              Exportar CSV
            </a>
          )
        }
      />

      <form action="/historial" className="card mb-4 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <Filtro label="Número" htmlFor="q">
          <input id="q" name="q" defaultValue={f.q} placeholder="OP-0012 o 12" className="input" inputMode="search" />
        </Filtro>
        <Filtro label="Cliente" htmlFor="cliente">
          <input id="cliente" name="cliente" defaultValue={f.cliente} placeholder="Nombre" className="input" />
        </Filtro>
        <Filtro label="Estado" htmlFor="estado">
          <select id="estado" name="estado" defaultValue={f.estado} className="input">
            <option value="terminada_entregada">Terminadas y entregadas</option>
            <option value="terminada">{ESTADO_LABEL.terminada}</option>
            <option value="entregada">{ESTADO_LABEL.entregada}</option>
            <option value="cancelada">{ESTADO_LABEL.cancelada}</option>
            <option value="todas">Todas (incluye canceladas)</option>
          </select>
        </Filtro>
        <Filtro label="Entrega desde" htmlFor="desde">
          <input id="desde" name="desde" type="date" defaultValue={f.desde} className="input" />
        </Filtro>
        <Filtro label="Entrega hasta" htmlFor="hasta">
          <input id="hasta" name="hasta" type="date" defaultValue={f.hasta} className="input" />
        </Filtro>
        <div className="flex gap-2">
          {hayFiltros && (
            <Link href="/historial" className="btn-secondary flex-1">
              Limpiar
            </Link>
          )}
          <button type="submit" className="btn-primary flex-1">
            Filtrar
          </button>
        </div>
      </form>

      {filas.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-500">
          {hayFiltros ? "No hay órdenes con estos filtros." : "Todavía no hay órdenes terminadas ni entregadas."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="eyebrow border-b border-slate-100 bg-slate-50/60 text-left">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente / producto</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Estado</th>
                  {conPrecio && <th className="px-4 py-3 text-right">Precio</th>}
                  {conPrecio && <th className="px-4 py-3 text-right">Saldo</th>}
                  <th className="px-4 py-3">Último cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((o) => (
                  <tr key={o.id} className="hover:bg-brand-50/60">
                    <td className="px-4 py-3 font-mono font-semibold">
                      <Link href={`/ordenes/${o.id}`} className="text-brand-700 hover:underline">
                        {o.numero}
                      </Link>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-medium">{o.cliente?.nombre}</p>
                      <p className="truncate text-xs text-slate-500">
                        {TIPO_PRODUCTO_LABEL[o.tipo_producto]}
                        {o.descripcion ? ` · ${o.descripcion}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatFecha(o.fecha_entrega)}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={o.estado} />
                    </td>
                    {conPrecio && (
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoneda(o.precio?.precio)}</td>
                    )}
                    {conPrecio && (
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
                          Number(o.precio?.saldo ?? 0) > 0 ? "font-semibold text-amber-700" : "text-slate-600"
                        }`}
                      >
                        {formatMoneda(o.precio?.saldo)}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatFechaHora(o.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 md:hidden">
            {filas.map((o) => (
              <li key={o.id}>
                <Link href={`/ordenes/${o.id}`} className="block space-y-1.5 px-4 py-3 active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-brand-700">{o.numero}</span>
                    <EstadoBadge estado={o.estado} />
                  </div>
                  <p className="truncate text-sm font-medium">{o.cliente?.nombre}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{TIPO_PRODUCTO_LABEL[o.tipo_producto]}</span>
                    <span>· Entrega {formatFecha(o.fecha_entrega)}</span>
                    {conPrecio && o.precio && <span>· Saldo {formatMoneda(o.precio.saldo)}</span>}
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
