import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-lg font-bold text-brand-200 ring-4 ring-brand-100">
            OP
          </div>
          <h1 className="text-xl font-semibold text-navy-950">Órdenes de Producción</h1>
          <p className="mt-1 text-sm text-slate-500">Inicia sesión para continuar</p>
        </div>
        <div className="card p-6">
          <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-slate-100" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
