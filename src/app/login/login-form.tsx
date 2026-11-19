"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";

const MENSAJES: Record<string, string> = {
  inactivo: "Tu usuario está desactivado. Contacta con el administrador.",
  enlace: "El enlace no es válido o ha caducado. Pide al administrador una nueva invitación.",
};

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const aviso = state.error ?? MENSAJES[params.get("error") ?? ""];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={params.get("next") ?? "/"} />

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className="input"
          placeholder="nombre@empresa.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>

      {aviso && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {aviso}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
