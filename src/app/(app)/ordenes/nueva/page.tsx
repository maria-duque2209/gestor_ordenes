import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getClientesOpciones, getUsuariosAsignables } from "@/lib/orders";
import { PageHeader } from "@/components/page-header";
import { OrdenForm } from "../orden-form";

export const metadata: Metadata = { title: "Nueva orden" };

export default async function NuevaOrdenPage() {
  await requireRole("admin", "ventas");
  const [clientes, usuarios] = await Promise.all([getClientesOpciones(), getUsuariosAsignables()]);

  return (
    <>
      <Link href="/ordenes" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Órdenes
      </Link>
      <PageHeader title="Nueva orden" description="El número se asigna automáticamente al guardar." />
      <div className="max-w-3xl">
        <OrdenForm clientes={clientes} usuarios={usuarios} verPrecio />
      </div>
    </>
  );
}
