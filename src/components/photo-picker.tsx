"use client";

import { useEffect, useRef, useState } from "react";
import { comprimirImagen, formatBytes, TIPOS_ACEPTADOS } from "@/lib/images";
import type { FotoPendiente } from "@/lib/photos-client";

/**
 * Selector de varias fotos con vista previa y compresión en el cliente.
 * No sube nada: entrega la lista al componente padre.
 */
export function PhotoPicker({
  fotos,
  onChange,
  disabled,
}: {
  fotos: FotoPendiente[];
  onChange: (fotos: FotoPendiente[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(0);
  const [errores, setErrores] = useState<string[]>([]);
  const fotosRef = useRef(fotos);
  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);

  // Liberar las URLs de vista previa al desmontar
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), []);

  async function agregar(files: FileList | null) {
    if (!files?.length) return;
    const lista = Array.from(files);
    setErrores([]);
    setProcesando(lista.length);
    const nuevas: FotoPendiente[] = [];
    const errs: string[] = [];
    for (const file of lista) {
      try {
        const blob = await comprimirImagen(file);
        nuevas.push({
          id: crypto.randomUUID(),
          blob,
          preview: URL.createObjectURL(blob),
          nombre: file.name,
          descripcion: "",
        });
      } catch (e) {
        errs.push(e instanceof Error ? e.message : String(e));
      }
      setProcesando((n) => n - 1);
    }
    setErrores(errs);
    onChange([...fotosRef.current, ...nuevas]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function quitar(id: string) {
    const foto = fotos.find((f) => f.id === id);
    if (foto) URL.revokeObjectURL(foto.preview);
    onChange(fotos.filter((f) => f.id !== id));
  }

  function describir(id: string, descripcion: string) {
    onChange(fotos.map((f) => (f.id === id ? { ...f, descripcion } : f)));
  }

  return (
    <div className="space-y-3">
      {fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fotos.map((f) => (
            <li key={f.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="relative aspect-[4/3] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.preview} alt={f.nombre} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => quitar(f.id)}
                  disabled={disabled}
                  className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/75 px-2 py-0.5 text-xs text-white hover:bg-slate-900"
                  aria-label={`Quitar ${f.nombre}`}
                >
                  Quitar
                </button>
                <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-900/60 px-1.5 text-[11px] text-white">
                  {formatBytes(f.blob.size)}
                </span>
              </div>
              <input
                type="text"
                value={f.descripcion}
                onChange={(e) => describir(f.id, e.target.value)}
                disabled={disabled}
                placeholder="Descripción (opcional)"
                aria-label={`Descripción de ${f.nombre}`}
                className="w-full border-0 border-t border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-0"
                maxLength={200}
              />
            </li>
          ))}
        </ul>
      )}

      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50 ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <span className="font-medium text-slate-900">
          {procesando > 0 ? `Procesando ${procesando} foto(s)…` : "Añadir fotos"}
        </span>
        <span className="mt-0.5 text-xs">Desde la cámara o la galería · se comprimen automáticamente</span>
        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_ACEPTADOS}
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => agregar(e.target.files)}
        />
      </label>

      {errores.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
