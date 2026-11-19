import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_LABEL, ROL_LABEL } from "@/lib/labels";
import { hoyISO } from "@/lib/format";
import type { EstadoOrden } from "@/lib/types";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Inicio" };

const ESTADOS_ACTIVOS: EstadoOrden[] = ["pendiente", "en_produccion", "control_calidad", "terminada"];

export default async function InicioPage({ searchParams }: PageProps<"/">) {
  const [user, params, resumen] = await Promise.all([getCurrentUser(), searchParams, getResumen()]);

  return (
    <>
      <PageHeader
        title={`Hola, ${user.nombre || user.email}`}
        description={`Has entrado como ${ROL_LABEL[user.rol]}.`}
      />

      {params.error === "sin_permiso" && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para ver esa sección.
        </p>
      )}

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ESTADOS_ACTIVOS.map((estado) => (
          <Stat key={estado} label={ESTADO_LABEL[estado]} value={resumen.porEstado[estado] ?? 0} />
        ))}
        <Stat label="Atrasadas" value={resumen.atrasadas} tone={resumen.atrasadas > 0 ? "danger" : "default"} />
      </section>

      <p className="mt-6 text-sm text-slate-500">
        {user.rol === "taller"
          ? "Los datos muestran las órdenes que tienes asignadas (o todas, según la configuración)."
          : "Los datos incluyen todas las órdenes activas."}{" "}
        <Link href="/ordenes" className="font-medium text-slate-900 underline underline-offset-2">
          Ver órdenes
        </Link>
      </p>
    </>
  );
}

async function getResumen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("estado, fecha_entrega")
    .in("estado", ESTADOS_ACTIVOS);

  if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);

  const hoy = hoyISO();
  const porEstado: Partial<Record<EstadoOrden, number>> = {};
  let atrasadas = 0;
  for (const o of data ?? []) {
    porEstado[o.estado as EstadoOrden] = (porEstado[o.estado as EstadoOrden] ?? 0) + 1;
    if (o.fecha_entrega && o.fecha_entrega < hoy && o.estado !== "terminada") atrasadas++;
  }
  return { porEstado, atrasadas };
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "danger" ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
