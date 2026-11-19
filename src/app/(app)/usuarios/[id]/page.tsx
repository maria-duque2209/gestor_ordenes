import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { formatFechaHora } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { EditarUsuarioForm, RestablecerContrasenaForm } from "./usuario-forms";

export const metadata: Metadata = { title: "Editar usuario" };

export default async function EditarUsuarioPage({ params }: PageProps<"/usuarios/[id]">) {
  const yo = await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nombre, email, rol, activo, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const usuario = data as Profile;
  const esYo = usuario.id === yo.id;

  return (
    <>
      <Link href="/usuarios" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Usuarios
      </Link>
      <PageHeader
        title={usuario.nombre || usuario.email}
        description={`${usuario.email} · alta ${formatFechaHora(usuario.created_at)}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Datos y permisos</h2>
          <EditarUsuarioForm usuario={usuario} esYo={esYo} />
        </section>

        {!esYo && (
          <section className="card p-5 sm:p-6">
            <h2 className="mb-1 font-semibold">Restablecer contraseña</h2>
            <p className="mb-4 text-sm text-slate-500">
              Asigna una contraseña temporal si el usuario la olvidó. Podrá cambiarla en «Mi cuenta».
            </p>
            <RestablecerContrasenaForm userId={usuario.id} />
          </section>
        )}
      </div>
    </>
  );
}
