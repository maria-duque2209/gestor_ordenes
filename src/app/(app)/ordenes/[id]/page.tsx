import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrden } from "@/lib/orders";
import { EstadoBadge, PrioridadBadge, RolBadge } from "@/components/badges";
import { formatFecha, formatFechaHora, formatMoneda } from "@/lib/format";
import { TIPO_PRODUCTO_LABEL, UNIDAD_LABEL } from "@/lib/labels";
import { estadosPermitidos, alertaEntrega, textoAlerta } from "@/lib/estados";
import { ESPEC_LABEL } from "@/lib/especificaciones";
import { Icon, type IconName } from "@/components/icons";
import type { EstadoOrden } from "@/lib/types";
import { FotosOrden } from "./fotos";
import { EstadoForm } from "./estado-form";
import { NotasOrden } from "./notas";
import { EliminarOrden } from "./eliminar-orden";

export const metadata: Metadata = { title: "Orden" };

const ESPEC_ICONO: Record<string, IconName> = {
  potencia: "bolt",
  impedancia: "pulse",
  tipo_caja: "speaker",
  tamano_driver: "ruler",
};

/** Tinte de la tarjeta «Estado» según el estado actual. */
const ESTADO_TONO: Record<EstadoOrden, { card: string; icono: string; icon: IconName }> = {
  pendiente: { card: "", icono: "bg-slate-100 text-slate-600", icon: "clock" },
  en_produccion: { card: "border-brand-100 bg-brand-50/70", icono: "bg-brand-600 text-white", icon: "gear" },
  control_calidad: { card: "border-violet-100 bg-violet-50/70", icono: "bg-violet-600 text-white", icon: "check" },
  terminada: { card: "border-emerald-100 bg-emerald-50/70", icono: "bg-emerald-500 text-white", icon: "check" },
  entregada: { card: "border-emerald-100 bg-emerald-50/70", icono: "bg-emerald-600 text-white", icon: "check" },
  cancelada: { card: "border-red-100 bg-red-50/70", icono: "bg-red-500 text-white", icon: "close" },
};

function Card({
  title,
  icon,
  iconClass = "text-brand-600",
  children,
  className = "",
}: {
  title: string;
  icon: IconName;
  iconClass?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2.5 text-[17px] font-semibold text-turbo-950">
        <Icon name={icon} className={`h-6 w-6 ${iconClass}`} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/75">{label}</dt>
      <dd className="mt-1 break-words text-[15px] text-slate-900">{children || "—"}</dd>
    </div>
  );
}

export default async function OrdenPage({ params, searchParams }: PageProps<"/ordenes/[id]">) {
  const user = await getCurrentUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const orden = await getOrden(id, user);
  if (!orden) notFound();

  const gestiona = user.rol === "admin" || user.rol === "ventas";
  const alerta = alertaEntrega(orden);
  const permitidos = estadosPermitidos(user.rol, orden.estado);
  const medidas = [orden.alto, orden.ancho, orden.profundidad].some((m) => m !== null)
    ? `${orden.alto ?? "—"} × ${orden.ancho ?? "—"} × ${orden.profundidad ?? "—"} ${UNIDAD_LABEL[orden.unidad]}`
    : null;
  const especificaciones = Object.entries(orden.especificaciones ?? {}).filter(([, v]) => v);
  const tono = ESTADO_TONO[orden.estado];

  return (
    <>
      <Link href="/ordenes" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        ← Órdenes
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[28px] font-bold tracking-wide text-turbo-950">{orden.numero}</h1>
            <EstadoBadge estado={orden.estado} />
            {orden.prioridad !== "normal" && <PrioridadBadge prioridad={orden.prioridad} />}
          </div>
          <p className="mt-1 text-[15px] text-slate-600">
            {TIPO_PRODUCTO_LABEL[orden.tipo_producto]} para <span className="font-medium text-slate-800">{orden.cliente.nombre}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ordenes/${orden.id}/imprimir`} className="btn-secondary">
            <Icon name="printer" className="h-4 w-4" />
            Imprimir / PDF
          </Link>
          {gestiona && (
            <Link href={`/ordenes/${orden.id}/editar`} className="btn-secondary">
              <Icon name="pencil" className="h-4 w-4" />
              Editar
            </Link>
          )}
          {user.rol === "admin" && (
            <a href="#eliminar-orden" className="btn border border-red-300 bg-red-50 text-red-700 shadow-sm hover:bg-red-100">
              <Icon name="trash" className="h-4 w-4" />
              Eliminar orden
            </a>
          )}
        </div>
      </div>

      {sp.creada && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Orden {orden.numero} creada.
        </p>
      )}
      {sp.guardada && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Cambios guardados.
        </p>
      )}
      {sp.fotos_error && (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La orden se guardó, pero {String(sp.fotos_error)} foto(s) no se pudieron subir. Inténtalo de nuevo abajo.
        </p>
      )}
      {alerta && (
        <p
          role="alert"
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${alerta.tipo === "atrasada" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}
        >
          {textoAlerta(alerta)} ({formatFecha(orden.fecha_entrega)})
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Producto" icon="box">
            <dl className="grid gap-5 sm:grid-cols-2 sm:gap-0">
              <div className="space-y-5 sm:pr-6">
                <Dato label="Descripción">
                  {orden.descripcion && <span className="whitespace-pre-line">{orden.descripcion}</span>}
                </Dato>
                <Dato label="Medidas (alto × ancho × profundidad)">{medidas}</Dato>
              </div>
              <div className="space-y-5 sm:border-l sm:border-slate-200 sm:pl-6">
                <Dato label="Color">{orden.color}</Dato>
                <Dato label="Material / acabado">{orden.material}</Dato>
              </div>
            </dl>
          </Card>

          <Card title="Especificaciones técnicas" icon="settings">
            {especificaciones.length === 0 && !orden.notas_especificaciones ? (
              <p className="text-sm text-slate-500">Sin especificaciones.</p>
            ) : (
              <>
                {especificaciones.length > 0 && (
                  <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
                    {especificaciones.map(([k, v], i) => (
                      <div
                        key={k}
                        className={`flex min-w-0 gap-2 px-0 sm:px-4 ${i % 4 !== 0 ? "sm:border-l sm:border-slate-200" : "sm:pl-0"} ${
                          i % 2 !== 0 ? "border-l border-slate-200 pl-4 sm:pl-4" : ""
                        }`}
                      >
                        <Icon name={ESPEC_ICONO[k] ?? "gear"} className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                        <Dato label={ESPEC_LABEL[k] ?? k}>{v}</Dato>
                      </div>
                    ))}
                  </dl>
                )}
                {orden.notas_especificaciones && (
                  <div className={especificaciones.length ? "mt-5 border-t border-slate-100 pt-4" : ""}>
                    <Dato label="Notas técnicas">
                      <span className="whitespace-pre-line">{orden.notas_especificaciones}</span>
                    </Dato>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card title={`Fotos (${orden.fotos.length})`} icon="camera">
            <FotosOrden
              orderId={orden.id}
              puedeSubir
              fotos={orden.fotos.map((f) => ({
                id: f.id,
                url: f.url,
                descripcion: f.descripcion,
                autor: f.autor,
                created_at: f.created_at,
                puedeBorrar: gestiona || f.uploaded_by === user.id,
              }))}
            />
          </Card>

          <Card title={`Notas de avance (${orden.notas.length})`} icon="note">
            <NotasOrden
              orderId={orden.id}
              notas={orden.notas.map((n) => ({ id: n.id, texto: n.texto, autor: n.autor, created_at: n.created_at }))}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <section className={`card p-5 sm:p-6 ${tono.card}`}>
            <h2 className="mb-3 flex items-center gap-2.5 text-[17px] font-semibold text-turbo-950">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tono.icono}`}>
                <Icon name={tono.icon} className="h-4 w-4" />
              </span>
              Estado
            </h2>
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <EstadoBadge estado={orden.estado} />
              <span className="text-xs text-slate-500">desde {formatFechaHora(orden.updated_at)}</span>
            </div>

            <dl className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-slate-200/70">
              <Dato label="Inicio">{formatFecha(orden.fecha_inicio)}</Dato>
              <Dato label="Entrega">
                <span className={alerta?.tipo === "atrasada" ? "font-semibold text-red-600" : "font-semibold"}>
                  {formatFecha(orden.fecha_entrega)}
                </span>
              </Dato>
            </dl>

            <EstadoForm orderId={orden.id} actual={orden.estado} permitidos={permitidos} />

            <p className="mt-4 text-xs text-slate-500">
              Creada {formatFechaHora(orden.created_at)}
              {orden.creador?.nombre ? ` por ${orden.creador.nombre}` : ""}
            </p>
          </section>

          <Card title="Cliente" icon="users">
            <dl className="grid grid-cols-2 gap-0">
              <div className="space-y-4 pr-4">
                <Dato label="Nombre">
                  {gestiona ? (
                    <Link href={`/clientes/${orden.cliente.id}`} className="font-medium hover:text-brand-700 hover:underline">
                      {orden.cliente.nombre}
                    </Link>
                  ) : (
                    orden.cliente.nombre
                  )}
                </Dato>
                <Dato label="Teléfono">
                  {orden.cliente.telefono && (
                    <a href={`tel:${orden.cliente.telefono}`} className="hover:underline">
                      {orden.cliente.telefono}
                    </a>
                  )}
                </Dato>
                {gestiona && <Dato label="Dirección">{orden.cliente.direccion}</Dato>}
              </div>
              <div className="space-y-4 border-l border-slate-200 pl-4">
                <Dato label="Documento / NIT">{orden.cliente.documento}</Dato>
                {gestiona && <Dato label="Email">{orden.cliente.email}</Dato>}
              </div>
            </dl>
          </Card>

          <Card title="Responsables" icon="clients">
            {orden.responsables.length === 0 ? (
              <p className="text-sm text-slate-500">Sin responsables asignados.</p>
            ) : (
              <ul className="space-y-2.5">
                {orden.responsables.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-[15px]">
                    <span className="truncate">{r.nombre || r.email}</span>
                    <RolBadge rol={r.rol} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {gestiona && (
            <Card
              title="Precio"
              icon="dollar"
              iconClass="text-emerald-600"
              className={orden.precio ? "border-emerald-100 bg-emerald-50/60" : ""}
            >
              {orden.precio ? (
                <dl className="grid grid-cols-3">
                  <div className="pr-3">
                    <Dato label="Precio total">
                      <span className="text-lg font-bold tabular-nums">{formatMoneda(orden.precio.precio)}</span>
                    </Dato>
                  </div>
                  <div className="border-l border-slate-200 px-3">
                    <Dato label="Anticipo">
                      <span className="text-lg font-bold tabular-nums">{formatMoneda(orden.precio.anticipo)}</span>
                    </Dato>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <Dato label="Saldo">
                      <span
                        className={`text-lg font-bold tabular-nums ${orden.precio.saldo > 0 ? "text-orange-600" : "text-emerald-700"}`}
                      >
                        {formatMoneda(orden.precio.saldo)}
                      </span>
                    </Dato>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Sin precio registrado.</p>
              )}
            </Card>
          )}
        </div>
      </div>

      {user.rol === "admin" && (
        <section id="eliminar-orden" className="mt-8 scroll-mt-24 rounded-2xl border border-red-200 bg-red-50/70 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Icon name="trash" className="h-7 w-7 shrink-0 text-red-600" />
            <div className="flex-1">
              <h2 className="font-semibold text-red-700">Eliminar orden</h2>
              <p className="mt-1 text-sm text-slate-600">
                Borra la orden, sus fotos, notas e historial. No se puede deshacer. Si solo no se va a fabricar, es mejor
                cambiar su estado a «Cancelada».
              </p>
              <div className="mt-4">
                <EliminarOrden orderId={orden.id} numero={orden.numero} />
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
