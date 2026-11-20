"use client";

import { Icon } from "@/components/icons";

/**
 * Abre el diálogo de impresión del navegador (desde ahí se elige «Guardar como PDF").
 * El título del documento pasa a ser el nombre sugerido del archivo PDF.
 */
export function BotonImprimir({ nombreArchivo }: { nombreArchivo: string }) {
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => {
        const anterior = document.title;
        document.title = nombreArchivo;
        window.print();
        document.title = anterior;
      }}
    >
      <Icon name="orders" className="h-4 w-4" />
      Imprimir / Guardar PDF
    </button>
  );
}
