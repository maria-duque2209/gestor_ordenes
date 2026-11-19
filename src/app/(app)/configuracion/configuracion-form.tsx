"use client";

import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { guardarConfiguracion } from "./actions";

const OPCIONES = [
  {
    value: "asignadas",
    titulo: "Solo las órdenes asignadas",
    detalle: "Cada persona del taller ve únicamente las órdenes en las que es responsable.",
  },
  {
    value: "todas",
    titulo: "Todas las órdenes",
    detalle: "Todo el taller ve todas las órdenes, aunque no esté asignado.",
  },
];

export function ConfiguracionForm({ tallerVerTodas }: { tallerVerTodas: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(guardarConfiguracion, {});

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">El taller ve</legend>
        {OPCIONES.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-slate-900"
          >
            <input
              type="radio"
              name="taller_ver_todas"
              value={o.value}
              defaultChecked={(o.value === "todas") === tallerVerTodas}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium">{o.titulo}</span>
              <span className="block text-xs text-slate-500">{o.detalle}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormAlert state={state} />
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
