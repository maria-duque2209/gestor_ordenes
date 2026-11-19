"use client";

import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import { formatFechaHora } from "@/lib/format";
import type { FormState } from "@/lib/forms";
import { agregarNota } from "../actions";

export interface NotaVista {
  id: string;
  texto: string;
  autor: string | null;
  created_at: string;
}

export function NotasOrden({ orderId, notas }: { orderId: string; notas: NotaVista[] }) {
  // React vacía el formulario automáticamente tras enviarlo.
  const [state, action] = useActionState<FormState, FormData>(agregarNota.bind(null, orderId), {});

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-2">
        <label htmlFor="texto" className="sr-only">
          Nueva nota
        </label>
        <textarea
          id="texto"
          name="texto"
          rows={2}
          maxLength={2000}
          required
          className="input"
          placeholder="Escribe una nota de avance…"
        />
        {state.fieldErrors?.texto && <p className="text-sm text-red-600">{state.fieldErrors.texto[0]}</p>}
        {state.error && <FormAlert state={state} />}
        <SubmitButton className="btn-secondary" pendingText="Guardando…">
          Añadir nota
        </SubmitButton>
      </form>

      {notas.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay notas.</p>
      ) : (
        <ul className="space-y-3">
          {notas.map((n) => (
            <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="whitespace-pre-line text-sm">{n.texto}</p>
              <p className="mt-1 text-xs text-slate-500">
                {n.autor ?? "—"} · {formatFechaHora(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
