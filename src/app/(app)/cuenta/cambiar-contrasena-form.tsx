"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { cambiarContrasena } from "./actions";

export function CambiarContrasenaForm() {
  const [state, action] = useActionState<FormState, FormData>(cambiarContrasena, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Nueva contraseña" name="password" state={state} hint="Mínimo 8 caracteres">
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" required />
      </Field>
      <Field label="Repite la contraseña" name="confirmacion" state={state}>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          className="input"
          required
        />
      </Field>
      <FormAlert state={state} />
      <SubmitButton>Guardar contraseña</SubmitButton>
    </form>
  );
}
