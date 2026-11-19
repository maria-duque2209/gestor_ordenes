"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { formatFechaHora } from "@/lib/format";
import { subirFotos, type FotoPendiente } from "@/lib/photos-client";
import { eliminarFoto } from "../actions";

export interface FotoVista {
  id: string;
  url: string | null;
  descripcion: string | null;
  autor: string | null;
  created_at: string;
  puedeBorrar: boolean;
}

export function FotosOrden({ orderId, fotos, puedeSubir }: { orderId: string; fotos: FotoVista[]; puedeSubir: boolean }) {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<FotoPendiente[]>([]);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [subiendo, startSubida] = useTransition();
  const [borrando, startBorrado] = useTransition();

  function subir() {
    startSubida(async () => {
      const errores = await subirFotos(orderId, pendientes);
      pendientes.forEach((f) => URL.revokeObjectURL(f.preview));
      setPendientes([]);
      setMensaje(
        errores.length
          ? { tipo: "error", texto: `No se pudieron subir ${errores.length} foto(s): ${errores.join("; ")}` }
          : { tipo: "ok", texto: "Fotos subidas." },
      );
      router.refresh();
    });
  }

  function borrar(id: string) {
    startBorrado(async () => {
      const res = await eliminarFoto(id);
      setAbierta(null);
      setMensaje(res.error ? { tipo: "error", texto: res.error } : { tipo: "ok", texto: "Foto eliminada." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {fotos.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay fotos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setAbierta(i)}
                className="group block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-left"
              >
                <div className="aspect-[4/3]">
                  {f.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.descripcion ?? "Foto de la orden"} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-slate-500">No disponible</span>
                  )}
                </div>
                {f.descripcion && <p className="truncate bg-white px-2 py-1 text-xs text-slate-600">{f.descripcion}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mensaje && (
        <p
          role={mensaje.tipo === "error" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${mensaje.tipo === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}
        >
          {mensaje.texto}
        </p>
      )}

      {puedeSubir && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <PhotoPicker fotos={pendientes} onChange={setPendientes} disabled={subiendo} />
          {pendientes.length > 0 && (
            <button type="button" onClick={subir} disabled={subiendo} className="btn-primary">
              {subiendo ? "Subiendo…" : `Subir ${pendientes.length} foto(s)`}
            </button>
          )}
        </div>
      )}

      {abierta !== null && fotos[abierta] && (
        <Visor
          key={abierta}
          fotos={fotos}
          indice={abierta}
          onCambiar={setAbierta}
          onCerrar={() => setAbierta(null)}
          onBorrar={borrar}
          borrando={borrando}
        />
      )}
    </div>
  );
}

function Visor({
  fotos,
  indice,
  onCambiar,
  onCerrar,
  onBorrar,
  borrando,
}: {
  fotos: FotoVista[];
  indice: number;
  onCambiar: (i: number) => void;
  onCerrar: () => void;
  onBorrar: (id: string) => void;
  borrando: boolean;
}) {
  const foto = fotos[indice];
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowRight" && indice < fotos.length - 1) onCambiar(indice + 1);
      if (e.key === "ArrowLeft" && indice > 0) onCambiar(indice - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [indice, fotos.length, onCambiar, onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label="Foto">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-200">
        <span>
          {indice + 1} / {fotos.length}
        </span>
        <button type="button" onClick={onCerrar} className="rounded-lg px-3 py-1.5 hover:bg-white/10">
          Cerrar ✕
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {foto.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt={foto.descripcion ?? "Foto de la orden"} className="max-h-full max-w-full object-contain" />
        )}
        {indice > 0 && (
          <button
            type="button"
            onClick={() => onCambiar(indice - 1)}
            className="absolute left-2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
            aria-label="Anterior"
          >
            ‹
          </button>
        )}
        {indice < fotos.length - 1 && (
          <button
            type="button"
            onClick={() => onCambiar(indice + 1)}
            className="absolute right-2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
            aria-label="Siguiente"
          >
            ›
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-300">
        <div>
          {foto.descripcion && <p className="text-white">{foto.descripcion}</p>}
          <p className="text-xs">
            {foto.autor ?? "—"} · {formatFechaHora(foto.created_at)}
          </p>
        </div>
        {foto.puedeBorrar &&
          (confirmar ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onBorrar(foto.id)}
                disabled={borrando}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                {borrando ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button type="button" onClick={() => setConfirmar(false)} className="btn border border-white/20 text-white">
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmar(true)} className="btn border border-white/20 text-white hover:bg-white/10">
              Eliminar foto
            </button>
          ))}
      </div>
    </div>
  );
}
