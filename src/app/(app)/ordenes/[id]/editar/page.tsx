import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getClientesOpciones, getOrden, getUsuariosAsignables } from "@/lib/orders";
import { PageHeader } from "@/components/page-header";
import { OrdenForm } from "../../orden-form";

export const metadata: Metadata = { title: "Editar orden" };

export default async function EditarOrdenPage({ params }: PageProps<"/ordenes/[id]/editar">) {
  const user = await requireRole("admin", "ventas");
  const { id } = await params;
  const [orden, clientes, usuarios] = await Promise.all([
    getOrden(id, user),
    getClientesOpciones(),
    getUsuariosAsignables(),
  ]);
  if (!orden) notFound();

  // Si algún responsable actual está inactivo, mostrarlo igualmente para poder quitarlo.
  const ids = new Set(usuarios.map((u) => u.id));
  const todos = [...usuarios, ...orden.responsables.filter((r) => !ids.has(r.id))];

  return (
    <>
      <Link href={`/ordenes/${orden.id}`} className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← {orden.numero}
      </Link>
      <PageHeader title={`Editar ${orden.numero}`} description="Las fotos se gestionan desde el detalle de la orden." />
      <div className="max-w-3xl">
        <OrdenForm orden={orden} clientes={clientes} usuarios={todos} verPrecio />
      </div>
    </>
  );
}
