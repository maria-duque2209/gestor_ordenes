"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Field, FormAlert, SubmitButton, initial } from "@/components/form";
import type { FormState } from "@/lib/forms";
import { ROL_LABEL } from "@/lib/labels";
import { crearUsuario } from "../actions";

const ROL_AYUDA = {
  admin: "Acceso total, incluidos usuarios y configuración.",
  ventas: "Clientes, órdenes, precios y fotos. No puede cancelar órdenes.",
  taller: "Ve sus órdenes asignadas, cambia el estado y añade notas y fotos. No ve precios.",
} as const;

/** `enModal`: dentro del modal «Nuevo usuario» se muestra Cancelar, que cierra el modal. */
export function NuevoUsuarioForm({ enModal = false }: { enModal?: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(crearUsuario, {});
  const [modo, setModo] = useState(initial(state, "modo", "invitar"));
  const [rol, setRol] = useState(initial(state, "rol", "taller") as keyof typeof ROL_AYUDA);

  return (
    <form action={action} className="space-y-5">
      <Field label="Nombre" name="nombre" state={state} required>
        <input id="nombre" name="nombre" className="input" defaultValue={initial(state, "nombre")} required />
      </Field>

      <Field label="Email" name="email" state={state} required>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          className="input"
          defaultValue={initial(state, "email")}
          required
        />
      </Field>

      <Field label="Rol" name="rol" state={state} hint={ROL_AYUDA[rol]} required>
        <select
          id="rol"
          name="rol"
          className="input"
          value={rol}
          onChange={(e) => setRol(e.target.value as keyof typeof ROL_AYUDA)}
        >
          {Object.entries(ROL_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Acceso</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-slate-900">
          <input
            type="radio"
            name="modo"
            value="invitar"
            checked={modo === "invitar"}
            onChange={() => setModo("invitar")}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Enviar invitación por email</span>
            <span className="block text-xs text-slate-500">El usuario crea su propia contraseña desde el enlace.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-slate-900">
          <input
            type="radio"
            name="modo"
            value="contrasena"
            checked={modo === "contrasena"}
            onChange={() => setModo("contrasena")}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Crear con contraseña temporal</span>
            <span className="block text-xs text-slate-500">
              Sin email. Le das la contraseña y la cambia en «Mi cuenta».
            </span>
          </span>
        </label>
      </fieldset>

      {modo === "contrasena" && (
        <Field label="Contraseña temporal" name="password" state={state} hint="Mínimo 8 caracteres" required>
          <input id="password" name="password" type="text" autoComplete="new-password" className="input" required />
        </Field>
      )}

      <FormAlert state={state} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Creando…">{modo === "invitar" ? "Enviar invitación" : "Crear usuario"}</SubmitButton>
        {enModal && (
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
