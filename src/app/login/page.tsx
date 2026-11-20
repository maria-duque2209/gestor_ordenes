import type { Metadata } from "next";
import { Suspense } from "react";
import { MARCA } from "@/lib/marca";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-turbo-950 px-4 py-10">
      {/* Resplandor de marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/30 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cian/10 blur-[100px]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARCA.logoColor} alt="" className="mx-auto mb-4 h-16 w-auto drop-shadow-[0_0_24px_rgb(154_79_255/0.55)]" />
          <h1 className="font-display text-xl font-bold tracking-wide text-white">{MARCA.nombre}</h1>
          <p className="mt-1.5 text-sm text-brand-200/80">Sistema de órdenes de fabricación</p>
        </div>
        <div className="card p-6">
          <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-slate-100" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">{MARCA.slogan} · Inicia sesión para continuar</p>
      </div>
    </main>
  );
}
