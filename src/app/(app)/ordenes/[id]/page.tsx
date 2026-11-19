import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrden } from "@/lib/orders";
import { EstadoBadge, PrioridadBadge, RolBadge } from "@/components/badges";
import { formatFecha, formatFechaHora, formatMoneda } from "@/lib/format";
import { TIPO_PRODUCTO_LABEL, UNIDAD_LABEL } from "@/lib/labels";
import { estadosPermitidos, alertaEntrega, textoAlerta } from "@/lib/estados";
import { FotosOrden } from "./fotos";
import { EstadoForm } from "./estado-form";
import { NotasOrden } from "./notas";
import { EliminarOrden } from "./eliminar-orden";

export const metadata: Metadata = { title: "Orden" };

const ESPEC_LABEL: Record<string, string> = {
  potencia: "Potencia",
  impedancia: "Impedancia",
  tamano_driver: "Tamaño del driver",
  tipo_caja: "Tipo de caja",
};

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-slate-900">{children || "—"}</dd>
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

  return (
    <>
      <Link href="/ordenes" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Órdenes
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{orden.numero}</h1>
            <EstadoBadge estado={orden.estado} />
            <PrioridadBadge prioridad={orden.prioridad} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {TIPO_PRODUCTO_LABEL[orden.tipo_producto]} para <span className="font-medium">{orden.cliente.nombre}</span>
          </p>
        </div>
        {gestiona && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/ordenes/${orden.id}/editar`} className="btn-secondary">
              Editar
            </Link>
          </div>
        )}
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
        <p role="alert" className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${alerta.tipo === "atrasada" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-900"}`}>
          {textoAlerta(alerta)} ({formatFecha(orden.fecha_entrega)})
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Producto">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Dato label="Descripción">
                  {orden.descripcion && <span className="whitespace-pre-line">{orden.descripcion}</span>}
                </Dato>
              </div>
              <Dato label="Medidas (alto × ancho × profundidad)">{medidas}</Dato>
              <Dato label="Color">{orden.color}</Dato>
              <Dato label="Material / acabado">{orden.material}</Dato>
            </dl>
          </Card>

          <Card title="Especificaciones técnicas">
            {especificaciones.length === 0 && !orden.notas_especificaciones ? (
              <p className="text-sm text-slate-500">Sin especificaciones.</p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                {especificaciones.map(([k, v]) => (
                  <Dato key={k} label={ESPEC_LABEL[k] ?? k}>
                    {v}
                  </Dato>
                ))}
                {orden.notas_especificaciones && (
                  <div className="sm:col-span-2">
                    <Dato label="Notas técnicas">
                      <span className="whitespace-pre-line">{orden.notas_especificaciones}</span>
                    </Dato>
                  </div>
                )}
              </dl>
            )}
          </Card>

          <Card title={`Fotos (${orden.fotos.length})`}>
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

          <Card title={`Notas de avance (${orden.notas.length})`}>
            <NotasOrden
              orderId={orden.id}
              notas={orden.notas.map((n) => ({ id: n.id, texto: n.texto, autor: n.autor, created_at: n.created_at }))}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Estado">
            <div className="mb-4 flex items-center gap-2">
              <EstadoBadge estado={orden.estado} />
              <span className="text-xs text-slate-500">desde {formatFechaHora(orden.updated_at)}</span>
            </div>
            <EstadoForm orderId={orden.id} actual={orden.estado} permitidos={permitidos} />
          </Card>

          <Card title="Fechas">
            <dl className="space-y-3">
              <Dato label="Inicio">{formatFecha(orden.fecha_inicio)}</Dato>
              <Dato label="Entrega">
                <span className={alerta?.tipo === "atrasada" ? "font-semibold text-red-600" : ""}>
                  {formatFecha(orden.fecha_entrega)}
                </span>
              </Dato>
              <Dato label="Creada">
                {formatFechaHora(orden.created_at)}
                {orden.creador?.nombre ? ` · ${orden.creador.nombre}` : ""}
              </Dato>
              <Dato label="Última modificación">{formatFechaHora(orden.updated_at)}</Dato>
            </dl>
          </Card>

          <Card title="Cliente">
            <dl className="space-y-3">
              <Dato label="Nombre">
                {gestiona ? (
                  <Link href={`/clientes/${orden.cliente.id}`} className="font-medium hover:underline">
                    {orden.cliente.nombre}
                  </Link>
                ) : (
                  orden.cliente.nombre
                )}
              </Dato>
              <Dato label="Documento / NIT">{orden.cliente.documento}</Dato>
              <Dato label="Teléfono">
                {orden.cliente.telefono && (
                  <a href={`tel:${orden.cliente.telefono}`} className="hover:underline">
                    {orden.cliente.telefono}
                  </a>
                )}
              </Dato>
              {gestiona && <Dato label="Email">{orden.cliente.email}</Dato>}
              {gestiona && <Dato label="Dirección">{orden.cliente.direccion}</Dato>}
            </dl>
          </Card>

          <Card title="Responsables">
            {orden.responsables.length === 0 ? (
              <p className="text-sm text-slate-500">Sin responsables asignados.</p>
            ) : (
              <ul className="space-y-2">
                {orden.responsables.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{r.nombre || r.email}</span>
                    <RolBadge rol={r.rol} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {gestiona && (
            <Card title="Precio">
              {orden.precio ? (
                <dl className="space-y-3">
                  <Dato label="Precio total">{formatMoneda(orden.precio.precio)}</Dato>
                  <Dato label="Anticipo">{formatMoneda(orden.precio.anticipo)}</Dato>
                  <Dato label="Saldo">
                    <span className={`text-base font-semibold ${orden.precio.saldo > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {formatMoneda(orden.precio.saldo)}
                    </span>
                  </Dato>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Sin precio registrado.</p>
              )}
            </Card>
          )}
        </div>
      </div>

      {user.rol === "admin" && (
        <section className="mt-8 rounded-xl border border-red-200 p-5 sm:p-6">
          <h2 className="font-semibold text-red-700">Eliminar orden</h2>
          <p className="mt-1 text-sm text-slate-600">
            Borra la orden, sus fotos, notas e historial. No se puede deshacer. Si solo no se va a fabricar, es mejor
            cambiar su estado a «Cancelada».
          </p>
          <div className="mt-4">
            <EliminarOrden orderId={orden.id} numero={orden.numero} />
          </div>
        </section>
      )}
    </>
  );
}
