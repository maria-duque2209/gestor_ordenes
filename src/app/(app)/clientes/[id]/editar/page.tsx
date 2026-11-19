import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import type { Client } from "@/lib/types";
import { ClienteForm } from "../../cliente-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  await requireRole("admin", "ventas");
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>();
  if (!cliente) notFound();

  return (
    <>
      <Link href={`/clientes/${cliente.id}`} className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← {cliente.nombre}
      </Link>
      <PageHeader title="Editar cliente" />
      <div className="card max-w-2xl p-5 sm:p-6">
        <ClienteForm cliente={cliente} />
      </div>
    </>
  );
}
