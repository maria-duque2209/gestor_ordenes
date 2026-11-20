"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Field } from "@/components/form";
import { ClienteSelector } from "@/components/cliente-selector";
import { PhotoPicker } from "@/components/photo-picker";
import { PRIORIDAD_LABEL, ROL_LABEL, TIPO_PRODUCTO_LABEL, UNIDAD_LABEL } from "@/lib/labels";
import { formatMoneda } from "@/lib/format";
import { subirFotos, type FotoPendiente } from "@/lib/photos-client";
import type { ClienteOpcion, OrdenDetalle, Responsable } from "@/lib/orders";
import { guardarOrden, type GuardarOrdenResult } from "./actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

const soloDigitos = (v: string) => v.replace(/\D/g, "");

export function OrdenForm({
  orden,
  clientes,
  usuarios,
  verPrecio,
  enModal = false,
}: {
  orden?: OrdenDetalle;
  clientes: ClienteOpcion[];
  usuarios: Responsable[];
  verPrecio: boolean;
  /** Dentro del modal «Nueva orden»: Cancelar cierra el modal y el scroll es el del modal. */
  enModal?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<GuardarOrdenResult>({});
  const [paso, setPaso] = useState<string | null>(null);
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">("existente");
  const [fotos, setFotos] = useState<FotoPendiente[]>([]);
  const [precio, setPrecio] = useState(orden?.precio ? String(Math.round(orden.precio.precio)) : "");
  const [anticipo, setAnticipo] = useState(orden?.precio ? String(Math.round(orden.precio.anticipo)) : "");
  const esp = orden?.especificaciones ?? {};
  const asignados = new Set(orden?.responsables.map((r) => r.id));

  // Responsables: primero taller, luego el resto
  const usuariosOrdenados = [...usuarios].sort(
    (a, b) => Number(b.rol === "taller") - Number(a.rol === "taller") || a.nombre.localeCompare(b.nombre),
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setPaso("Guardando la orden…");
      const res = await guardarOrden(orden?.id ?? null, formData);
      if (!res.ok || !res.id) {
        setState(res);
        setPaso(null);
        const contenedor = enModal ? document.querySelector("[data-modal-scroll]") : null;
        (contenedor ?? window).scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      let fotosError = 0;
      if (fotos.length) {
        setPaso(`Subiendo ${fotos.length} foto(s)…`);
        fotosError = (await subirFotos(res.id, fotos)).length;
      }
      const qs = new URLSearchParams({ [orden ? "guardada" : "creada"]: "1" });
      if (fotosError) qs.set("fotos_error", String(fotosError));
      router.push(`/ordenes/${res.id}?${qs}`);
    });
  }

  const saldo = Number(precio || 0) - Number(anticipo || 0);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Section title="Cliente">
        <input type="hidden" name="modo_cliente" value={modoCliente} />
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 text-sm" role="tablist">
          {(["existente", "nuevo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modoCliente === m}
              onClick={() => setModoCliente(m)}
              className={`rounded-md px-3 py-1.5 font-medium ${
                modoCliente === m ? "bg-turbo-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m === "existente" ? "Cliente existente" : "Cliente nuevo"}
            </button>
          ))}
        </div>

        {modoCliente === "existente" ? (
          <Field label="Cliente" name="client_id" state={state} required>
            <ClienteSelector
              clientes={clientes}
              name="client_id"
              defaultId={orden?.client_id}
              invalid={!!state.fieldErrors?.client_id}
            />
          </Field>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nombre o razón social" name="cliente_nombre" state={state} required>
                <input id="cliente_nombre" name="cliente_nombre" className="input" />
              </Field>
            </div>
            <Field label="Documento / NIT" name="cliente_documento" state={state}>
              <input id="cliente_documento" name="cliente_documento" className="input" />
            </Field>
            <Field label="Teléfono" name="cliente_telefono" state={state}>
              <input id="cliente_telefono" name="cliente_telefono" type="tel" inputMode="tel" className="input" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email" name="cliente_email" state={state}>
                <input id="cliente_email" name="cliente_email" type="email" inputMode="email" className="input" />
              </Field>
            </div>
          </div>
        )}
      </Section>

      <Section title="Producto">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tipo de producto" name="tipo_producto" state={state} required>
            <select id="tipo_producto" name="tipo_producto" className="input" defaultValue={orden?.tipo_producto ?? "subwoofer"}>
              {Object.entries(TIPO_PRODUCTO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridad" name="prioridad" state={state}>
            <select id="prioridad" name="prioridad" className="input" defaultValue={orden?.prioridad ?? "normal"}>
              {Object.entries(PRIORIDAD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descripción" name="descripcion" state={state}>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            className="input"
            defaultValue={orden?.descripcion ?? ""}
            placeholder='Ej.: Cajón sellado para subwoofer de 12" con alfombra'
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Color" name="color" state={state}>
            <input id="color" name="color" className="input" defaultValue={orden?.color ?? ""} />
          </Field>
          <Field label="Material / acabado" name="material" state={state}>
            <input id="material" name="material" className="input" defaultValue={orden?.material ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Medidas">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              ["alto", "Alto"],
              ["ancho", "Ancho"],
              ["profundidad", "Profundidad"],
            ] as const
          ).map(([name, label]) => (
            <Field key={name} label={label} name={name} state={state}>
              <input
                id={name}
                name={name}
                inputMode="decimal"
                className="input"
                defaultValue={orden?.[name] ?? ""}
              />
            </Field>
          ))}
          <Field label="Unidad" name="unidad" state={state}>
            <select id="unidad" name="unidad" className="input" defaultValue={orden?.unidad ?? "cm"}>
              {Object.entries(UNIDAD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Especificaciones técnicas">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Potencia" name="spec_potencia" state={state}>
            <input id="spec_potencia" name="spec_potencia" className="input" defaultValue={esp.potencia ?? ""} placeholder="Ej.: 500 W RMS" />
          </Field>
          <Field label="Impedancia" name="spec_impedancia" state={state}>
            <input id="spec_impedancia" name="spec_impedancia" className="input" defaultValue={esp.impedancia ?? ""} placeholder="Ej.: 4 Ω" />
          </Field>
          <Field label="Tamaño del driver" name="spec_tamano_driver" state={state}>
            <input id="spec_tamano_driver" name="spec_tamano_driver" className="input" defaultValue={esp.tamano_driver ?? ""} placeholder='Ej.: 12"' />
          </Field>
          <Field label="Tipo de caja" name="spec_tipo_caja" state={state}>
            <input id="spec_tipo_caja" name="spec_tipo_caja" className="input" defaultValue={esp.tipo_caja ?? ""} placeholder="Ej.: Sellada, bass reflex…" />
          </Field>
        </div>
        <Field label="Notas técnicas" name="notas_especificaciones" state={state}>
          <textarea
            id="notas_especificaciones"
            name="notas_especificaciones"
            rows={3}
            className="input"
            defaultValue={orden?.notas_especificaciones ?? ""}
            placeholder="Frecuencia de sintonía, volumen interno, terminales, etc."
          />
        </Field>
      </Section>

      <Section title="Responsables y fechas">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Responsables</legend>
          {usuariosOrdenados.length === 0 ? (
            <p className="text-sm text-slate-500">No hay usuarios activos.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {usuariosOrdenados.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
                >
                  <input type="checkbox" name="responsables" value={u.id} defaultChecked={asignados.has(u.id)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{u.nombre || u.email}</span>
                    <span className="block text-xs text-slate-500">{ROL_LABEL[u.rol]}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Fecha de inicio" name="fecha_inicio" state={state}>
            <input id="fecha_inicio" name="fecha_inicio" type="date" className="input" defaultValue={orden?.fecha_inicio ?? ""} />
          </Field>
          <Field label="Fecha de entrega" name="fecha_entrega" state={state}>
            <input id="fecha_entrega" name="fecha_entrega" type="date" className="input" defaultValue={orden?.fecha_entrega ?? ""} />
          </Field>
        </div>
      </Section>

      {verPrecio && (
        <Section title="Precio">
          <p className="-mt-2 text-xs text-slate-500">Solo lo ven administración y ventas. El taller no tiene acceso.</p>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Precio total (COP)" name="precio" state={state}>
              <input
                id="precio"
                name="precio"
                inputMode="numeric"
                className="input"
                value={precio}
                onChange={(e) => setPrecio(soloDigitos(e.target.value))}
                placeholder="0"
              />
            </Field>
            <Field label="Anticipo (COP)" name="anticipo" state={state}>
              <input
                id="anticipo"
                name="anticipo"
                inputMode="numeric"
                className="input"
                value={anticipo}
                onChange={(e) => setAnticipo(soloDigitos(e.target.value))}
                placeholder="0"
              />
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">Saldo</p>
              <p className={`py-2.5 text-lg font-semibold tabular-nums ${saldo < 0 ? "text-red-600" : ""}`}>
                {precio ? formatMoneda(saldo) : "—"}
              </p>
            </div>
          </div>
        </Section>
      )}

      {!orden && (
        <Section title="Fotos de referencia">
          <PhotoPicker fotos={fotos} onChange={setFotos} disabled={pending} />
        </Section>
      )}

      <div
        className={
          enModal
            ? "sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
            : "sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0"
        }
      >
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? (paso ?? "Guardando…") : orden ? "Guardar cambios" : "Crear orden"}
        </button>
        {enModal ? (
          <button type="button" onClick={() => router.back()} disabled={pending} className="btn-secondary">
            Cancelar
          </button>
        ) : (
          <Link href={orden ? `/ordenes/${orden.id}` : "/ordenes"} className="btn-secondary">
            Cancelar
          </Link>
        )}
        {state.fieldErrors && <span className="text-sm text-red-600">Revisa los campos marcados.</span>}
      </div>
    </form>
  );
}
