"use client";

import { useActionState, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { eliminarOrden } from "../actions";

export function EliminarOrden({ orderId, numero }: { orderId: string; numero: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [texto, setTexto] = useState("");
  const [state, action] = useActionState<FormState>(eliminarOrden.bind(null, orderId), {});

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="btn border border-red-300 bg-white text-red-700 hover:bg-red-50">
        Eliminar orden…
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="confirmar-numero" className="block text-sm">
        Escribe <span className="font-mono font-semibold">{numero}</span> para confirmar:
      </label>
      <input
        id="confirmar-numero"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="input max-w-xs font-mono"
        autoComplete="off"
      />
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton
          className="btn bg-red-600 text-white hover:bg-red-700"
          pendingText="Eliminando…"
          disabled={texto.trim().toUpperCase() !== numero}
        >
          Eliminar definitivamente
        </SubmitButton>
        <button type="button" onClick={() => setConfirmando(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
