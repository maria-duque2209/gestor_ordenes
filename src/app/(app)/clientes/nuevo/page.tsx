import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ClienteForm } from "../cliente-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NuevoClientePage() {
  await requireRole("admin", "ventas");
  return (
    <>
      <Link href="/clientes" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Clientes
      </Link>
      <PageHeader title="Nuevo cliente" />
      <div className="card max-w-2xl p-5 sm:p-6">
        <ClienteForm />
      </div>
    </>
  );
}
