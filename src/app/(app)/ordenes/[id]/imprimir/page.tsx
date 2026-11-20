import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrden } from "@/lib/orders";
import { formatFecha, formatFechaHora, formatMoneda } from "@/lib/format";
import { ESTADO_LABEL, PRIORIDAD_LABEL, ROL_LABEL, TIPO_PRODUCTO_LABEL, UNIDAD_LABEL } from "@/lib/labels";
import { ESPEC_LABEL } from "@/lib/especificaciones";
import { MARCA } from "@/lib/marca";
import { BotonImprimir } from "./boton-imprimir";

export const metadata: Metadata = { title: "Imprimir orden" };

/** Pasos que el taller marca a mano en la hoja impresa. */
const CONTROL = ["Corte", "Ensamble", "Instalación de componentes", "Acabado", "Prueba de sonido", "Empaque"];

export default async function ImprimirOrdenPage({ params, searchParams }: PageProps<"/ordenes/[id]/imprimir">) {
  const user = await getCurrentUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const orden = await getOrden(id, user);
  if (!orden) notFound();

  const gestiona = user.rol === "admin" || user.rol === "ventas";
  // Por defecto la hoja sale sin precios (es la que va al taller); admin/ventas pueden incluirlos.
  const conPrecios = gestiona && sp.precios === "1";
  const conFotos = sp.fotos !== "0";
  const conNotas = sp.notas !== "0";

  const url = (cambio: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const estado = { precios: conPrecios ? "1" : null, fotos: conFotos ? null : "0", notas: conNotas ? null : "0", ...cambio };
    for (const [k, v] of Object.entries(estado)) if (v) q.set(k, v);
    const s = q.toString();
    return `/ordenes/${orden.id}/imprimir${s ? `?${s}` : ""}`;
  };

  const medidas = [orden.alto, orden.ancho, orden.profundidad].some((m) => m !== null)
    ? `${orden.alto ?? "—"} × ${orden.ancho ?? "—"} × ${orden.profundidad ?? "—"} ${UNIDAD_LABEL[orden.unidad]}`
    : null;
  const especificaciones = Object.entries(orden.especificaciones ?? {}).filter(([, v]) => v);
  const fotos = orden.fotos.filter((f) => f.url);
  const nombreArchivo = `${orden.numero} - ${orden.cliente.nombre}`.replace(/[\\/:*?"<>|]/g, " ");

  return (
    <>
      {/* Barra de herramientas: no se imprime */}
      <div className="mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/ordenes/${orden.id}`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Volver a la orden
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-turbo-950">Hoja de la orden {orden.numero}</h1>
          <p className="mt-1 text-sm text-slate-500">
            En el diálogo de impresión elige «Guardar como PDF» para descargarla.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {gestiona && (
            <Opcion activa={conPrecios} href={url({ precios: conPrecios ? null : "1" })}>
              Precios
            </Opcion>
          )}
          <Opcion activa={conFotos} href={url({ fotos: conFotos ? "0" : null })}>
            Fotos
          </Opcion>
          <Opcion activa={conNotas} href={url({ notas: conNotas ? "0" : null })}>
            Notas
          </Opcion>
          <BotonImprimir nombreArchivo={nombreArchivo} />
        </div>
      </div>

      {/* Hoja */}
      <article className="mx-auto max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-slate-900 shadow-[0_12px_40px_-12px_rgb(15_23_42/0.25)] ring-1 ring-slate-200 print:max-w-none print:p-0 print:shadow-none print:ring-0 sm:p-12">
        <header className="flex items-start justify-between gap-6 border-b-2 border-brand-600 pb-5">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARCA.logoColor} alt={MARCA.nombre} className="h-14 w-auto" />
            <div className="leading-tight">
              <p className="font-display text-lg font-bold tracking-wide text-turbo-950">{MARCA.nombre}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{MARCA.descripcion}</p>
              <p className="mt-1 text-[11px] text-slate-600">
                WhatsApp {MARCA.whatsapp} · Instagram {MARCA.instagram}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Orden de producción</p>
            <p className="font-mono text-3xl font-bold tracking-tight text-turbo-950">{orden.numero}</p>
            <p className="mt-1 text-xs text-slate-600">
              {ESTADO_LABEL[orden.estado]} · Prioridad {PRIORIDAD_LABEL[orden.prioridad].toLowerCase()}
            </p>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-3 gap-6">
          <Bloque titulo="Cliente">
            <p className="font-semibold">{orden.cliente.nombre}</p>
            {orden.cliente.documento && <p>Doc./NIT: {orden.cliente.documento}</p>}
            {orden.cliente.telefono && <p>Tel.: {orden.cliente.telefono}</p>}
            {gestiona && orden.cliente.direccion && <p>{orden.cliente.direccion}</p>}
          </Bloque>
          <Bloque titulo="Fechas">
            <Fila label="Inicio">{formatFecha(orden.fecha_inicio)}</Fila>
            <Fila label="Entrega">
              <span className="font-semibold">{formatFecha(orden.fecha_entrega)}</span>
            </Fila>
            <Fila label="Creada">{formatFechaHora(orden.created_at)}</Fila>
          </Bloque>
          <Bloque titulo="Responsables">
            {orden.responsables.length === 0 ? (
              <p className="text-slate-500">Sin asignar</p>
            ) : (
              orden.responsables.map((r) => (
                <p key={r.id}>
                  {r.nombre || r.email} <span className="text-slate-500">· {ROL_LABEL[r.rol]}</span>
                </p>
              ))
            )}
          </Bloque>
        </div>

        <Seccion titulo="Producto">
          <dl className="grid grid-cols-4 gap-x-6 gap-y-3">
            <Dato label="Tipo">{TIPO_PRODUCTO_LABEL[orden.tipo_producto]}</Dato>
            <Dato label="Medidas (al × an × pr)">{medidas}</Dato>
            <Dato label="Color">{orden.color}</Dato>
            <Dato label="Material / acabado">{orden.material}</Dato>
            <div className="col-span-4">
              <Dato label="Descripción">
                {orden.descripcion && <span className="whitespace-pre-line">{orden.descripcion}</span>}
              </Dato>
            </div>
          </dl>
        </Seccion>

        <Seccion titulo="Especificaciones técnicas">
          {especificaciones.length === 0 && !orden.notas_especificaciones ? (
            <p className="text-slate-500">Sin especificaciones.</p>
          ) : (
            <>
              {especificaciones.length > 0 && (
                <table className="w-full border-collapse">
                  <tbody>
                    {especificaciones.map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-200">
                        <th className="w-1/3 py-1.5 pr-4 text-left font-medium text-slate-600">{ESPEC_LABEL[k] ?? k}</th>
                        <td className="py-1.5">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {orden.notas_especificaciones && (
                <div className="mt-3">
                  <Dato label="Notas técnicas">
                    <span className="whitespace-pre-line">{orden.notas_especificaciones}</span>
                  </Dato>
                </div>
              )}
            </>
          )}
        </Seccion>

        {conPrecios && (
          <Seccion titulo="Precio">
            {orden.precio ? (
              <dl className="grid grid-cols-3 gap-6">
                <Dato label="Precio total">{formatMoneda(orden.precio.precio)}</Dato>
                <Dato label="Anticipo">{formatMoneda(orden.precio.anticipo)}</Dato>
                <Dato label="Saldo">
                  <span className="font-semibold">{formatMoneda(orden.precio.saldo)}</span>
                </Dato>
              </dl>
            ) : (
              <p className="text-slate-500">Sin precio registrado.</p>
            )}
          </Seccion>
        )}

        {conFotos && fotos.length > 0 && (
          <Seccion titulo={`Fotos (${fotos.length})`}>
            <div className="grid grid-cols-3 gap-3">
              {fotos.map((f) => (
                <figure key={f.id} className="break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url!}
                    alt={f.descripcion ?? "Foto de la orden"}
                    className="aspect-[4/3] w-full rounded-md border border-slate-200 object-cover"
                  />
                  {f.descripcion && <figcaption className="mt-1 text-[11px] text-slate-600">{f.descripcion}</figcaption>}
                </figure>
              ))}
            </div>
          </Seccion>
        )}

        {conNotas && orden.notas.length > 0 && (
          <Seccion titulo="Notas de avance">
            <ul className="space-y-2">
              {orden.notas.map((n) => (
                <li key={n.id} className="break-inside-avoid border-l-2 border-slate-300 pl-3">
                  <p className="text-[11px] text-slate-500">
                    {formatFechaHora(n.created_at)}
                    {n.autor ? ` · ${n.autor}` : ""}
                  </p>
                  <p className="whitespace-pre-line">{n.texto}</p>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        <Seccion titulo="Control de producción">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="w-8 py-1.5" />
                <th className="py-1.5">Paso</th>
                <th className="w-28 py-1.5">Fecha</th>
                <th className="w-40 py-1.5">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {CONTROL.map((paso) => (
                <tr key={paso} className="border-b border-slate-200">
                  <td className="py-2">
                    <span className="block h-3.5 w-3.5 rounded-sm border border-slate-400" />
                  </td>
                  <td className="py-2">{paso}</td>
                  <td className="py-2" />
                  <td className="py-2" />
                </tr>
              ))}
            </tbody>
          </table>
        </Seccion>

        <div className="mt-12 grid break-inside-avoid grid-cols-3 gap-8 text-center text-[11px] text-slate-600">
          {["Responsable de taller", "Control de calidad", "Recibido por el cliente"].map((f) => (
            <div key={f}>
              <div className="h-10 border-b border-slate-400" />
              <p className="mt-1.5">{f}</p>
            </div>
          ))}
        </div>

        {conPrecios && (
          <p className="mt-8 rounded-md bg-brand-50 px-4 py-2.5 text-center text-[11px] text-turbo-800">
            Medios de pago: <span className="font-semibold">{MARCA.pagos}</span> · WhatsApp {MARCA.whatsapp}
          </p>
        )}

        <footer className="mt-8 flex justify-between gap-4 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          <span>
            {orden.numero} · {orden.cliente.nombre}
          </span>
          <span className="font-display tracking-wide">{MARCA.slogan}</span>
          <span>Impresa el {formatFechaHora(new Date().toISOString())}</span>
        </footer>
      </article>
    </>
  );
}

function Opcion({ activa, href, children }: { activa: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-pressed={activa}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
        activa ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-500"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${activa ? "bg-brand-600" : "bg-slate-300"}`} aria-hidden="true" />
      {children}
    </Link>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid-page">
      <h2 className="mb-2.5 border-b border-slate-200 pb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-turbo-900">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-turbo-900">{titulo}</h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className="text-slate-500">{label}:</span> {children}
    </p>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}
