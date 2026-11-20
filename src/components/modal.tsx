"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "./icons";

/**
 * Modal para rutas interceptadas: fondo oscuro con desenfoque y la página de
 * atrás sin scroll. Se cierra con Esc, con la X o con router.back() (Cancelar).
 * El clic en el fondo NO cierra, para no perder un formulario a medio llenar.
 */
export function Modal({
  title,
  description,
  size = "lg",
  children,
}: {
  title: string;
  description?: string;
  /** md: formularios cortos (cliente) · lg: formularios largos (orden). */
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const previo = { overflow: html.style.overflow, paddingRight: html.style.paddingRight };
    // Compensa el ancho de la barra de scroll para que el fondo no «salte».
    const barra = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (barra > 0) html.style.paddingRight = `${barra}px`;

    const foco = document.activeElement as HTMLElement | null;
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      html.style.overflow = previo.overflow;
      html.style.paddingRight = previo.paddingRight;
      window.removeEventListener("keydown", onKey);
      foco?.focus?.();
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 print:hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-turbo-950/45 backdrop-blur-md" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        className={`relative flex max-h-[94dvh] w-full ${size === "md" ? "max-w-2xl" : "max-w-3xl"} flex-col overflow-hidden rounded-t-2xl bg-canvas shadow-2xl ring-1 ring-black/5 outline-none sm:max-h-[90dvh] sm:rounded-2xl`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="modal-titulo" className="text-lg font-semibold text-turbo-950">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="-mr-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </header>

        <div data-modal-scroll className="flex-1 overflow-y-auto overscroll-contain px-4 pt-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
