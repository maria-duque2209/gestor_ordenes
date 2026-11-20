import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NuevaOrden } from "../nueva-orden";

export const metadata: Metadata = { title: "Nueva orden" };

/** Página completa (enlace directo o recarga). Desde la app se abre como modal: ver @modal/(.)ordenes/nueva. */
export default function NuevaOrdenPage() {
  return (
    <>
      <Link href="/ordenes" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Órdenes
      </Link>
      <PageHeader title="Nueva orden" description="El número se asigna automáticamente al guardar." />
      <div className="max-w-3xl">
        <NuevaOrden />
      </div>
    </>
  );
}
