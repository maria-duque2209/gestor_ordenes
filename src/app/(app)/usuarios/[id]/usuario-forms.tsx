"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton, initial } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { ROL_LABEL } from "@/lib/labels";
import type { Profile } from "@/lib/types";
import { actualizarUsuario, restablecerContrasena } from "../actions";

export function EditarUsuarioForm({ usuario, esYo }: { usuario: Profile; esYo: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(actualizarUsuario.bind(null, usuario.id), {});
  const activoInicial = state.values ? state.values.activo === "on" : usuario.activo;

  return (
    <form action={action} className="space-y-5">
      <Field label="Nombre" name="nombre" state={state} required>
        <input id="nombre" name="nombre" className="input" defaultValue={initial(state, "nombre", usuario.nombre)} required />
      </Field>

      <Field
        label="Rol"
        name="rol"
        state={state}
        hint={esYo ? "No puedes cambiar tu propio rol." : undefined}
      >
        <select
          id="rol"
          name="rol"
          className="input"
          defaultValue={initial(state, "rol", usuario.rol)}
          disabled={esYo}
        >
          {Object.entries(ROL_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {esYo && <input type="hidden" name="rol" value={usuario.rol} />}
      </Field>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={activoInicial}
          disabled={esYo}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium">Usuario activo</span>
          <span className="block text-xs text-slate-500">
            Si lo desactivas, no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se conserva.
          </span>
        </span>
      </label>
      {esYo && <input type="hidden" name="activo" value="on" />}

      <FormAlert state={state} />
      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}

export function RestablecerContrasenaForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<FormState, FormData>(restablecerContrasena.bind(null, userId), {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Nueva contraseña temporal" name="password" state={state} hint="Mínimo 8 caracteres">
        <input id="password" name="password" type="text" autoComplete="new-password" className="input" required />
      </Field>
      <FormAlert state={state} />
      <SubmitButton className="btn-secondary" pendingText="Cambiando…">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}
