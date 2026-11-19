"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton, initial } from "@/components/form";
import type { FormState } from "@/lib/forms";
import type { Client } from "@/lib/types";
import { guardarCliente } from "./actions";

export function ClienteForm({ cliente }: { cliente?: Client }) {
  const [state, action] = useActionState<FormState, FormData>(guardarCliente.bind(null, cliente?.id ?? null), {});
  const v = (name: keyof Client) => initial(state, name, cliente?.[name] as string | null | undefined);

  return (
    <form action={action} className="space-y-5">
      <Field label="Nombre o razón social" name="nombre" state={state} required>
        <input id="nombre" name="nombre" className="input" defaultValue={v("nombre")} required autoFocus={!cliente} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Documento / NIT" name="documento" state={state}>
          <input id="documento" name="documento" className="input" defaultValue={v("documento")} />
        </Field>
        <Field label="Teléfono" name="telefono" state={state}>
          <input id="telefono" name="telefono" type="tel" inputMode="tel" className="input" defaultValue={v("telefono")} />
        </Field>
      </div>

      <Field label="Email" name="email" state={state}>
        <input id="email" name="email" type="email" inputMode="email" className="input" defaultValue={v("email")} />
      </Field>

      <Field label="Dirección" name="direccion" state={state}>
        <input id="direccion" name="direccion" className="input" defaultValue={v("direccion")} />
      </Field>

      <Field label="Notas" name="notas" state={state}>
        <textarea id="notas" name="notas" rows={3} className="input" defaultValue={v("notas")} />
      </Field>

      <FormAlert state={state} />
      {state.duplicadoId && state.duplicadoId !== cliente?.id && (
        <Link href={`/clientes/${state.duplicadoId}`} className="inline-block text-sm font-medium underline underline-offset-2">
          Ver el cliente existente
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        <SubmitButton>{cliente ? "Guardar cambios" : "Crear cliente"}</SubmitButton>
        <Link href={cliente ? `/clientes/${cliente.id}` : "/clientes"} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
