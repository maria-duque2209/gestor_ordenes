"use client";

import { useId, useMemo, useState } from "react";
import type { ClienteOpcion } from "@/lib/orders";

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Buscador de clientes con lista desplegable. Guarda el id en un input oculto. */
export function ClienteSelector({
  clientes,
  name,
  defaultId,
  invalid,
}: {
  clientes: ClienteOpcion[];
  name: string;
  defaultId?: string;
  invalid?: boolean;
}) {
  const listId = useId();
  const [seleccionado, setSeleccionado] = useState<ClienteOpcion | undefined>(() =>
    clientes.find((c) => c.id === defaultId),
  );
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const resultados = useMemo(() => {
    const q = normalizar(texto.trim());
    const qDoc = texto.replace(/[^0-9a-z]/gi, "").toLowerCase();
    const lista = q
      ? clientes.filter(
          (c) =>
            normalizar(c.nombre).includes(q) ||
            (qDoc && (c.documento ?? "").replace(/[^0-9a-z]/gi, "").toLowerCase().includes(qDoc)) ||
            (c.telefono ?? "").includes(q),
        )
      : clientes;
    return lista.slice(0, 8);
  }, [clientes, texto]);

  function elegir(c: ClienteOpcion) {
    setSeleccionado(c);
    setTexto("");
    setAbierto(false);
  }

  if (seleccionado) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
        <input type="hidden" name={name} value={seleccionado.id} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{seleccionado.nombre}</p>
          <p className="truncate text-xs text-slate-500">
            {[seleccionado.documento, seleccionado.telefono].filter(Boolean).join(" · ") || "Sin datos"}
          </p>
        </div>
        <button type="button" onClick={() => setSeleccionado(undefined)} className="text-sm font-medium underline">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id={name}
        type="search"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        className="input"
        placeholder="Buscar por nombre, documento o teléfono"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActivo(0);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((i) => Math.min(i + 1, resultados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && abierto && resultados[activo]) {
            e.preventDefault();
            elegir(resultados[activo]);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
      />
      {abierto && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {resultados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Sin resultados. Usa «Cliente nuevo».</li>
          ) : (
            resultados.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === activo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(c);
                }}
                className={`cursor-pointer px-3 py-2 ${i === activo ? "bg-slate-100" : ""}`}
              >
                <p className="text-sm font-medium">{c.nombre}</p>
                {(c.documento || c.telefono) && (
                  <p className="text-xs text-slate-500">{[c.documento, c.telefono].filter(Boolean).join(" · ")}</p>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
