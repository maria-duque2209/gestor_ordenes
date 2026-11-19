"use client";

import { useActionState, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { eliminarCliente } from "../actions";

export function EliminarCliente({ clienteId, nombre }: { clienteId: string; nombre: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [state, action] = useActionState<FormState>(eliminarCliente.bind(null, clienteId), {});

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="btn border border-red-300 text-red-700 hover:bg-red-50">
        Eliminar cliente…
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm font-medium">¿Eliminar definitivamente a «{nombre}»?</p>
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="btn bg-red-600 text-white hover:bg-red-700" pendingText="Eliminando…">
          Sí, eliminar
        </SubmitButton>
        <button type="button" onClick={() => setConfirmando(false)} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
