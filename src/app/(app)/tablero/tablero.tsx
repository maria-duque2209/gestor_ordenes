"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { PrioridadBadge } from "@/components/badges";
import { AlertaEntrega } from "@/components/alerta-entrega";
import { alertaEntrega, estadosPermitidos, FLUJO } from "@/lib/estados";
import { formatFecha } from "@/lib/format";
import { ESTADO_LABEL, TIPO_PRODUCTO_LABEL } from "@/lib/labels";
import type { EstadoOrden, Order, Rol } from "@/lib/types";
import { cambiarEstado } from "../ordenes/actions";

export type TarjetaOrden = Pick<
  Order,
  "id" | "numero" | "tipo_producto" | "descripcion" | "estado" | "prioridad" | "fecha_entrega"
> & { cliente: string; responsables: string[] };

const COLOR_COLUMNA: Record<string, string> = {
  pendiente: "border-t-slate-400",
  en_produccion: "border-t-sky-500",
  control_calidad: "border-t-violet-500",
  terminada: "border-t-emerald-500",
  entregada: "border-t-emerald-700",
};

const PESO_PRIORIDAD = { urgente: 0, alta: 1, normal: 2, baja: 3 } as const;

/** Primero las atrasadas/próximas, luego por fecha de entrega y prioridad. */
function ordenar(a: TarjetaOrden, b: TarjetaOrden) {
  const fa = a.fecha_entrega ?? "9999-12-31";
  const fb = b.fecha_entrega ?? "9999-12-31";
  return fa.localeCompare(fb) || PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad];
}

export function Tablero({ tarjetas, rol }: { tarjetas: TarjetaOrden[]; rol: Rol }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<EstadoOrden | null>(null);
  const [optimistas, mover] = useOptimistic(tarjetas, (actual, { id, estado }: { id: string; estado: EstadoOrden }) =>
    actual.map((t) => (t.id === id ? { ...t, estado } : t)),
  );

  function moverA(id: string, estado: EstadoOrden) {
    const t = optimistas.find((x) => x.id === id);
    if (!t || t.estado === estado) return;
    if (!estadosPermitidos(rol, t.estado).includes(estado)) {
      setError("No puedes mover esta orden a ese estado.");
      return;
    }
    setError(null);
    startTransition(async () => {
      mover({ id, estado });
      const res = await cambiarEstado(id, estado);
      if (res.error) setError(`${t.numero}: ${res.error}`);
      router.refresh();
    });
  }

  const atrasadas = optimistas.filter((t) => alertaEntrega(t)?.tipo === "atrasada").length;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {atrasadas > 0 && (
        <p className="text-sm font-medium text-red-700">
          {atrasadas} orden(es) atrasada(s) en el tablero.
        </p>
      )}

      {/* En móvil, columnas con scroll horizontal; en escritorio, 5 columnas */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3 xl:min-w-0">
          {FLUJO.map((estado) => {
            const col = optimistas.filter((t) => t.estado === estado).sort(ordenar);
            return (
              <section
                key={estado}
                aria-label={ESTADO_LABEL[estado]}
                onDragOver={(e) => {
                  if (!arrastrando) return;
                  e.preventDefault();
                  setSobre(estado);
                }}
                onDragLeave={() => setSobre((s) => (s === estado ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setSobre(null);
                  setArrastrando(null);
                  if (id) moverA(id, estado);
                }}
                className={`flex min-h-[60vh] flex-col rounded-xl border-t-4 bg-slate-100/80 ${COLOR_COLUMNA[estado]} ${
                  sobre === estado ? "ring-2 ring-slate-900/30" : ""
                }`}
              >
                <h2 className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
                  {ESTADO_LABEL[estado]}
                  <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-600">{col.length}</span>
                </h2>
                <ul className="flex-1 space-y-2 px-2 pb-2">
                  {col.map((t) => (
                    <Tarjeta
                      key={t.id}
                      t={t}
                      permitidos={estadosPermitidos(rol, t.estado).filter((e) => e !== "cancelada")}
                      onMover={(e) => moverA(t.id, e)}
                      onDragStart={() => setArrastrando(t.id)}
                      onDragEnd={() => {
                        setArrastrando(null);
                        setSobre(null);
                      }}
                      arrastrando={arrastrando === t.id}
                    />
                  ))}
                  {col.length === 0 && <li className="px-2 py-6 text-center text-xs text-slate-400">Sin órdenes</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Tarjeta({
  t,
  permitidos,
  onMover,
  onDragStart,
  onDragEnd,
  arrastrando,
}: {
  t: TarjetaOrden;
  permitidos: EstadoOrden[];
  onMover: (e: EstadoOrden) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  arrastrando: boolean;
}) {
  const alerta = alertaEntrega(t);
  return (
    <li
      draggable={permitidos.length > 0}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white p-3 shadow-sm transition ${
        alerta?.tipo === "atrasada" ? "border-red-300" : "border-slate-200"
      } ${arrastrando ? "opacity-50" : ""} ${permitidos.length ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/ordenes/${t.id}`} className="font-mono text-sm font-semibold hover:underline">
          {t.numero}
        </Link>
        {t.prioridad !== "normal" && <PrioridadBadge prioridad={t.prioridad} />}
      </div>
      <p className="mt-1 truncate text-sm">{t.cliente}</p>
      <p className="truncate text-xs text-slate-500">
        {TIPO_PRODUCTO_LABEL[t.tipo_producto]}
        {t.descripcion ? ` · ${t.descripcion}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <span>Entrega {formatFecha(t.fecha_entrega)}</span>
        <AlertaEntrega orden={t} />
      </div>
      {t.responsables.length > 0 && (
        <p className="mt-1.5 truncate text-xs text-slate-600" title={t.responsables.join(", ")}>
          <span className="text-slate-400">Resp.:</span> {t.responsables.join(", ")}
        </p>
      )}
      {permitidos.length > 0 && (
        <label className="mt-2 block">
          <span className="sr-only">Mover {t.numero} a</span>
          <select
            value=""
            onChange={(e) => e.target.value && onMover(e.target.value as EstadoOrden)}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700"
          >
            <option value="">Mover a…</option>
            {permitidos.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
        </label>
      )}
    </li>
  );
}
