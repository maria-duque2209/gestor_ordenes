import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { NuevoUsuarioForm } from "./nuevo-usuario-form";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NuevoUsuarioPage() {
  await requireRole("admin");
  return (
    <>
      <Link href="/usuarios" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Usuarios
      </Link>
      <PageHeader title="Nuevo usuario" />
      <div className="card max-w-xl p-5 sm:p-6">
        <NuevoUsuarioForm />
      </div>
    </>
  );
}
