import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { RolBadge } from "@/components/badges";
import { CambiarContrasenaForm } from "./cambiar-contrasena-form";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage({ searchParams }: PageProps<"/cuenta">) {
  const [user, { bienvenida }] = await Promise.all([getCurrentUser(), searchParams]);

  return (
    <>
      <PageHeader title="Mi cuenta" />

      {bienvenida && (
        <p role="status" className="mb-4 max-w-xl rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
          ¡Bienvenido/a! Crea tu contraseña para poder entrar la próxima vez.
        </p>
      )}

      <div className="grid max-w-xl gap-6">
        <section className="card p-5 sm:p-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium">{user.nombre || "—"}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium break-all">{user.email}</dd>
            <dt className="text-slate-500">Rol</dt>
            <dd>
              <RolBadge rol={user.rol} />
            </dd>
          </dl>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">{bienvenida ? "Crear contraseña" : "Cambiar contraseña"}</h2>
          <CambiarContrasenaForm />
        </section>
      </div>
    </>
  );
}
