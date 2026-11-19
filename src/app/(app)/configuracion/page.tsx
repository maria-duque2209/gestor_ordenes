import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ConfiguracionForm } from "./configuracion-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("valor")
    .eq("clave", "taller_ver_todas")
    .maybeSingle();

  return (
    <>
      <PageHeader title="Configuración" />
      <section className="card max-w-2xl p-5 sm:p-6">
        <h2 className="font-semibold">Visibilidad de órdenes para el taller</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Los usuarios de taller nunca ven precios ni pueden editar clientes, sea cual sea esta opción.
        </p>
        <ConfiguracionForm tallerVerTodas={data?.valor === true} />
      </section>
    </>
  );
}
