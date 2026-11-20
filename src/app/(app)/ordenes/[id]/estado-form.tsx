"use client";

import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icons";
import { ESTADO_LABEL } from "@/lib/labels";
import { siguienteEstado } from "@/lib/estados";
import type { FormState } from "@/lib/forms";
import type { EstadoOrden } from "@/lib/types";
import { cambiarEstadoForm } from "../actions";

export function EstadoForm({
  orderId,
  actual,
  permitidos,
}: {
  orderId: string;
  actual: EstadoOrden;
  permitidos: EstadoOrden[];
}) {
  const [state, action] = useActionState<FormState, FormData>(cambiarEstadoForm.bind(null, orderId), {});
  const sugerido = siguienteEstado(actual);

  if (permitidos.length === 0) {
    return <p className="text-sm text-slate-500">Solo un administrador puede reabrir una orden cancelada.</p>;
  }

  return (
    <form action={action} className="space-y-3" key={actual}>
      <div className="space-y-1.5">
        <label htmlFor="estado" className="block text-sm font-medium text-slate-700">
          Nuevo estado
        </label>
        <select
          id="estado"
          name="estado"
          className="input"
          defaultValue={sugerido && permitidos.includes(sugerido) ? sugerido : permitidos[0]}
        >
          {permitidos.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="nota-estado" className="block text-sm font-medium text-slate-700">
          Nota (opcional)
        </label>
        <textarea id="nota-estado" name="nota" rows={2} maxLength={2000} className="input" placeholder="Motivo o comentario del cambio" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pendingText="Cambiando…" className="btn w-full bg-turbo-900 text-white shadow-sm hover:bg-turbo-800">
        <Icon name="refresh" className="h-4 w-4" />
        Cambiar estado
      </SubmitButton>
    </form>
  );
}
