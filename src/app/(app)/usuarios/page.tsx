import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ActivoBadge, RolBadge } from "@/components/badges";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Usuarios" };

const AVISOS: Record<string, string> = {
  invitar: "Invitación enviada. El usuario recibirá un email para crear su contraseña.",
  contrasena: "Usuario creado. Comunícale su contraseña temporal por un medio seguro.",
};

export default async function UsuariosPage({ searchParams }: PageProps<"/usuarios">) {
  const yo = await requireRole("admin");
  const { creado } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombre, email, rol, activo, created_at")
    .order("activo", { ascending: false })
    .order("nombre");
  if (error) throw new Error(error.message);
  const usuarios = (data ?? []) as Profile[];
  const aviso = typeof creado === "string" ? AVISOS[creado] : undefined;

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={`${usuarios.filter((u) => u.activo).length} activos de ${usuarios.length}`}
        actions={
          <Link href="/usuarios/nuevo" className="btn-primary">
            Nuevo usuario
          </Link>
        }
      />

      {aviso && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {aviso}
        </p>
      )}

      <div className="card overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {usuarios.map((u) => (
            <li key={u.id}>
              <Link
                href={`/usuarios/${u.id}`}
                className={`flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4 ${
                  u.activo ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {u.nombre || "(sin nombre)"}
                    {u.id === yo.id && <span className="ml-2 text-xs font-normal text-slate-500">(tú)</span>}
                  </p>
                  <p className="truncate text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <RolBadge rol={u.rol} />
                  <ActivoBadge activo={u.activo} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
