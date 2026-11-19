"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

export function Field({
  label,
  name,
  state,
  hint,
  required,
  children,
}: {
  label: string;
  name: string;
  state?: FormState;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const errors = state?.fieldErrors?.[name];
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {errors?.length ? (
        <p className="text-sm text-red-600">{errors[0]}</p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function FormAlert({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }
  return null;
}

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  className = "btn-primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Valor por defecto de un campo: lo último enviado (si hubo error) o el valor inicial. */
export function initial(state: FormState, name: string, fallback?: string | null) {
  return state.values?.[name] ?? fallback ?? "";
}
