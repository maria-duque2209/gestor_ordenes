import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { diasHasta, formatFecha } from "@/lib/format";
import { TIPO_PRODUCTO_LABEL } from "@/lib/labels";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Órdenes" };

type Fila = Pick<Order, "id" | "numero" | "tipo_producto" | "descripcion" | "estado" | "prioridad" | "fecha_entrega"> & {
  cliente: { nombre: string } | null;
};

function Entrega({ o }: { o: Fila }) {
  if (!o.fecha_entrega) return <span className="text-slate-400">—</span>;
  const abierta = !["terminada", "entregada", "cancelada"].includes(o.estado);
  const dias = diasHasta(o.fecha_entrega);
  const tono = abierta && dias < 0 ? "text-red-600 font-semibold" : abierta && dias <= 3 ? "text-amber-700 font-medium" : "";
  return <span className={tono}>{formatFecha(o.fecha_entrega)}</span>;
}

export default async function OrdenesPage() {
  const user = await getCurrentUser();
  const gestiona = user.rol === "admin" || user.rol === "ventas";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, numero, tipo_producto, descripcion, estado, prioridad, fecha_entrega, cliente:clients (nombre)")
    .order("numero_seq", { ascending: false })
    .limit(100)
    .returns<Fila[]>();
  if (error) throw new Error(error.message);
  const ordenes = data ?? [];

  return (
    <>
      <PageHeader
        title="Órdenes"
        description={user.rol === "taller" ? "Órdenes visibles para ti" : "Últimas 100 órdenes. Los filtros llegan en la Fase 4."}
        actions={
          gestiona && (
            <Link href="/ordenes/nueva" className="btn-primary">
              Nueva orden
            </Link>
          )
        }
      />

      {ordenes.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-500">
          {gestiona ? "Aún no hay órdenes. Crea la primera con «Nueva orden»." : "No tienes órdenes asignadas."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
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
                    <td className="px-4 py-3 font-mono font-medium">
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
                      <Entrega o={o} />
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
                <Link href={`/ordenes/${o.id}`} className="block space-y-1 px-4 py-3 active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium">{o.numero}</span>
                    <EstadoBadge estado={o.estado} />
                  </div>
                  <p className="truncate text-sm">{o.cliente?.nombre}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">{TIPO_PRODUCTO_LABEL[o.tipo_producto]}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Entrega o={o} />
                      {o.prioridad !== "normal" && <PrioridadBadge prioridad={o.prioridad} />}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
