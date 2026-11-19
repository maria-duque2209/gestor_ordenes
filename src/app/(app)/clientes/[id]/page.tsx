import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge } from "@/components/badges";
import { formatFecha } from "@/lib/format";
import { TIPO_PRODUCTO_LABEL } from "@/lib/labels";
import type { Client, Order } from "@/lib/types";
import { EliminarCliente } from "./eliminar-cliente";

export const metadata: Metadata = { title: "Cliente" };

type OrdenResumen = Pick<Order, "id" | "numero" | "tipo_producto" | "descripcion" | "estado" | "fecha_entrega">;

export default async function ClientePage({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const user = await requireRole("admin", "ventas");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const [{ data: cliente }, { data: ordenes }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
    supabase
      .from("orders")
      .select("id, numero, tipo_producto, descripcion, estado, fecha_entrega")
      .eq("client_id", id)
      .order("numero_seq", { ascending: false })
      .returns<OrdenResumen[]>(),
  ]);
  if (!cliente) notFound();

  const datos: [string, string | null][] = [
    ["Documento / NIT", cliente.documento],
    ["Teléfono", cliente.telefono],
    ["Email", cliente.email],
    ["Dirección", cliente.direccion],
    ["Cliente desde", formatFecha(cliente.created_at)],
  ];

  return (
    <>
      <Link href="/clientes" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Clientes
      </Link>
      <PageHeader
        title={cliente.nombre}
        actions={
          <Link href={`/clientes/${cliente.id}/editar`} className="btn-secondary">
            Editar
          </Link>
        }
      />

      {sp.guardado && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Cliente guardado.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 sm:p-6 lg:col-span-1">
          <h2 className="mb-4 font-semibold">Datos</h2>
          <dl className="space-y-3 text-sm">
            {datos.map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium break-words">{value || "—"}</dd>
              </div>
            ))}
            {cliente.notas && (
              <div>
                <dt className="text-slate-500">Notas</dt>
                <dd className="whitespace-pre-line">{cliente.notas}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="card overflow-hidden lg:col-span-2">
          <h2 className="border-b border-slate-100 px-5 py-4 font-semibold sm:px-6">
            Órdenes <span className="font-normal text-slate-500">({ordenes?.length ?? 0})</span>
          </h2>
          {ordenes?.length ? (
            <ul className="divide-y divide-slate-100">
              {ordenes.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm sm:px-6">
                  <span className="font-mono font-medium">{o.numero}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {TIPO_PRODUCTO_LABEL[o.tipo_producto]}
                    {o.descripcion ? ` · ${o.descripcion}` : ""}
                  </span>
                  <span className="text-slate-500">Entrega {formatFecha(o.fecha_entrega)}</span>
                  <EstadoBadge estado={o.estado} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500 sm:px-6">Este cliente aún no tiene órdenes.</p>
          )}
        </section>
      </div>

      {user.rol === "admin" && (
        <section className="mt-8 rounded-xl border border-red-200 p-5 sm:p-6">
          <h2 className="font-semibold text-red-700">Eliminar cliente</h2>
          <p className="mt-1 text-sm text-slate-600">
            Solo se puede eliminar un cliente sin órdenes. Esta acción no se puede deshacer.
          </p>
          <div className="mt-4">
            <EliminarCliente clienteId={cliente.id} nombre={cliente.nombre} />
          </div>
        </section>
      )}
    </>
  );
}
