import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ESTADO_LABEL, TIPO_PRODUCTO_LABEL } from "@/lib/labels";
import { formatFecha, haceDiasISO, hoyISO, ZONA_HORARIA } from "@/lib/format";
import { alertaEntrega, DIAS_AVISO, ESTADOS_ACTIVOS } from "@/lib/estados";
import type { EstadoOrden, Order } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { EstadoBadge, PrioridadBadge } from "@/components/badges";
import { AlertaEntrega } from "@/components/alerta-entrega";
import { Icon, type IconName } from "@/components/icons";
import { GraficoMensual, Leyenda, type PuntoMensual } from "@/components/grafico-mensual";

export const metadata: Metadata = { title: "Panel" };

const MESES = 6;
const FILAS_TABLA = 8;

type Fila = Pick<Order, "id" | "numero" | "tipo_producto" | "descripcion" | "estado" | "prioridad" | "fecha_entrega"> & {
  cliente: { nombre: string } | null;
};

const fechaLarga = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: ZONA_HORARIA,
});

export default async function PanelPage({ searchParams }: PageProps<"/">) {
  const [user, params, resumen, mensual] = await Promise.all([
    getCurrentUser(),
    searchParams,
    getResumen(),
    getMensual(),
  ]);
  const gestiona = user.rol === "admin" || user.rol === "ventas";
  const nombre = (user.nombre || user.email).split(" ")[0];

  return (
    <>
      <PageHeader
        title="Panel de producción"
        description={`Hola, ${nombre} · ${fechaLarga.format(new Date())}`}
        actions={
          <>
            <Link href="/ordenes?alerta=1&orden=entrega" className="btn-secondary">
              <Icon name="filter" className="h-4 w-4" />
              Ver alertas
            </Link>
            {gestiona && (
              <Link href="/ordenes/nueva" className="btn-primary">
                <Icon name="plus" className="h-4 w-4" />
                Nueva orden
              </Link>
            )}
          </>
        }
      />

      {params.error === "sin_permiso" && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para ver esa sección.
        </p>
      )}

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Órdenes activas"
          icon="orders"
          value={resumen.activas}
          href="/ordenes"
          chip={{ text: `+${mensual.ultimaSemana}`, tone: "brand" }}
          detalle="nuevas en los últimos 7 días"
        />
        <Kpi
          label="Atrasadas"
          icon="alert"
          value={resumen.atrasadas}
          href="/ordenes?alerta=1&orden=entrega"
          chip={resumen.atrasadas > 0 ? { text: "Atención", tone: "danger" } : { text: "Al día", tone: "good" }}
          detalle="fecha de entrega vencida"
        />
        <Kpi
          label="Entregas próximas"
          icon="clock"
          value={resumen.proximas}
          href="/ordenes?alerta=1&orden=entrega"
          chip={{ text: `${resumen.hoy} hoy`, tone: resumen.hoy > 0 ? "warning" : "neutral" }}
          detalle={`en los próximos ${DIAS_AVISO} días`}
        />
        <Kpi
          label="Listas para entregar"
          icon="check"
          value={resumen.porEstado.terminada ?? 0}
          href="/ordenes?estado=terminada"
          chip={{ text: "Terminadas", tone: "good" }}
          detalle="pendientes de entrega"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2" aria-labelledby="titulo-grafico">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 id="titulo-grafico" className="font-semibold text-turbo-950">
              Órdenes nuevas vs. entregas previstas
            </h2>
            <Leyenda />
          </div>
          <div className="px-6 pb-5 pt-8">
            <GraficoMensual datos={mensual.puntos} />
          </div>
        </section>

        <section className="card" aria-labelledby="titulo-carga">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 id="titulo-carga" className="font-semibold text-turbo-950">
              Carga por estado
            </h2>
            <span className="text-sm text-slate-400">{resumen.activas} activas</span>
          </div>
          <ul className="space-y-5 px-6 py-6">
            {ESTADOS_ACTIVOS.map((estado) => {
              const n = resumen.porEstado[estado] ?? 0;
              const p = resumen.activas ? Math.round((n / resumen.activas) * 100) : 0;
              return (
                <li key={estado}>
                  <Link href={`/ordenes?estado=${estado}`} className="group block">
                    <div className="mb-2 flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-slate-800 group-hover:text-brand-700">{ESTADO_LABEL[estado]}</span>
                      <span className="tabular-nums text-slate-500">
                        <span className="font-medium text-slate-700">{n}</span> · {p}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${p}%` }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden" aria-labelledby="titulo-entregas">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
          <h2 id="titulo-entregas" className="font-semibold text-turbo-950">
            Próximas entregas
          </h2>
          <Link href="/ordenes?orden=entrega" className="text-sm text-slate-500 hover:text-brand-700">
            {resumen.atrasadas + resumen.proximas} requieren atención · Ver todas
          </Link>
        </div>

        {resumen.siguientes.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">No hay órdenes activas.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="eyebrow border-b border-slate-100 text-left">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Orden</th>
                    <th className="px-6 py-3 font-semibold">Cliente / producto</th>
                    <th className="px-6 py-3 font-semibold">Prioridad</th>
                    <th className="px-6 py-3 font-semibold">Estado</th>
                    <th className="px-6 py-3 font-semibold">Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.siguientes.map((o) => (
                    <tr key={o.id} className="hover:bg-brand-50/60">
                      <td className="px-6 py-4 font-mono font-semibold">
                        <Link href={`/ordenes/${o.id}`} className="text-brand-700 hover:underline">
                          {o.numero}
                        </Link>
                      </td>
                      <td className="max-w-sm px-6 py-4">
                        <p className="truncate font-semibold text-slate-900">{o.cliente?.nombre}</p>
                        <p className="truncate text-xs text-slate-500">
                          {TIPO_PRODUCTO_LABEL[o.tipo_producto]}
                          {o.descripcion ? ` · ${o.descripcion}` : ""}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <PrioridadBadge prioridad={o.prioridad} />
                      </td>
                      <td className="px-6 py-4">
                        <EstadoBadge estado={o.estado} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="tabular-nums text-slate-700">{formatFecha(o.fecha_entrega)}</span>
                          <AlertaEntrega orden={o} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {resumen.siguientes.map((o) => (
                <li key={o.id}>
                  <Link href={`/ordenes/${o.id}`} className="block space-y-1.5 px-4 py-3 active:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-brand-700">{o.numero}</span>
                      <EstadoBadge estado={o.estado} />
                    </div>
                    <p className="truncate text-sm font-medium">{o.cliente?.nombre}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{TIPO_PRODUCTO_LABEL[o.tipo_producto]}</span>
                      <span>· Entrega {formatFecha(o.fecha_entrega)}</span>
                      <AlertaEntrega orden={o} />
                      {o.prioridad !== "normal" && <PrioridadBadge prioridad={o.prioridad} />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="mt-6 text-sm text-slate-500">
        {user.rol === "taller"
          ? "Ves las órdenes que tienes asignadas (o todas, según la configuración)."
          : "Los datos incluyen todas las órdenes activas."}
      </p>
    </>
  );
}

async function getResumen() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, numero, tipo_producto, descripcion, estado, prioridad, fecha_entrega, cliente:clients (nombre)")
    .in("estado", ESTADOS_ACTIVOS)
    .order("fecha_entrega", { ascending: true, nullsFirst: false })
    .returns<Fila[]>();

  if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);

  const filas = data ?? [];
  const porEstado: Partial<Record<EstadoOrden, number>> = {};
  let atrasadas = 0;
  let proximas = 0;
  let hoy = 0;
  for (const o of filas) {
    porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1;
    const alerta = alertaEntrega(o);
    if (alerta?.tipo === "atrasada") atrasadas++;
    else if (alerta) {
      proximas++;
      if (alerta.tipo === "hoy") hoy++;
    }
  }
  return { activas: filas.length, porEstado, atrasadas, proximas, hoy, siguientes: filas.slice(0, FILAS_TABLA) };
}

const mesFmt = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });
const mesBogota = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: ZONA_HORARIA });

/** Órdenes creadas y con entrega prevista por mes (últimos MESES meses, hora de Colombia). */
async function getMensual() {
  // Primero el cliente (lee cookies): así la fecha actual se calcula ya en tiempo de petición.
  const supabase = await createClient();
  const [y, m] = hoyISO().split("-").map(Number);
  const meses = Array.from({ length: MESES }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (MESES - 1 - i), 1));
    return { mes: d.toISOString().slice(0, 7), etiqueta: mesFmt.format(d).replace(".", "") };
  });
  const primero = `${meses[0].mes}-01`;
  const desdeTs = `${primero}T05:00:00Z`; // medianoche en Bogotá (UTC-5)

  const { data, error } = await supabase
    .from("orders")
    .select("created_at, fecha_entrega")
    .neq("estado", "cancelada")
    .or(`created_at.gte.${desdeTs},fecha_entrega.gte.${primero}`)
    .returns<Pick<Order, "created_at" | "fecha_entrega">[]>();

  if (error) throw new Error(`No se pudo cargar la actividad mensual: ${error.message}`);

  const puntos: PuntoMensual[] = meses.map((x) => ({ ...x, a: 0, b: 0 }));
  const idx = new Map(puntos.map((p, i) => [p.mes, i]));
  const semana = haceDiasISO(7);
  let ultimaSemana = 0;
  for (const o of data ?? []) {
    const creada = idx.get(mesBogota.format(new Date(o.created_at)));
    if (creada !== undefined) puntos[creada].a++;
    const entrega = o.fecha_entrega ? idx.get(o.fecha_entrega.slice(0, 7)) : undefined;
    if (entrega !== undefined) puntos[entrega].b++;
    if (new Date(o.created_at) >= new Date(semana)) ultimaSemana++;
  }
  return { puntos, ultimaSemana };
}

type Tono = "brand" | "good" | "warning" | "danger" | "neutral";

const TONO: Record<Tono, string> = {
  brand: "bg-brand-100 text-brand-700",
  good: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

function Kpi({
  label,
  icon,
  value,
  href,
  chip,
  detalle,
}: {
  label: string;
  icon: IconName;
  value: number;
  href: string;
  chip: { text: string; tone: Tono };
  detalle: string;
}) {
  return (
    <Link href={href} className="card group block p-6 transition hover:-translate-y-0.5 hover:border-brand-200">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow pt-1.5">{label}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-bold tabular-nums tracking-wide text-turbo-950">{value}</p>
      <div className="mt-4 flex items-center gap-2.5 text-sm text-slate-500">
        <span className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs font-semibold ${TONO[chip.tone]}`}>{chip.text}</span>
        <span className="leading-snug">{detalle}</span>
      </div>
    </Link>
  );
}
