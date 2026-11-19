import { alertaEntrega, textoAlerta } from "@/lib/estados";
import type { EstadoOrden } from "@/lib/types";

const ESTILO = {
  atrasada: "bg-red-600 text-white",
  hoy: "bg-amber-500 text-white",
  proxima: "bg-amber-100 text-amber-900",
} as const;

export function AlertaEntrega({ orden }: { orden: { estado: EstadoOrden; fecha_entrega: string | null } }) {
  const alerta = alertaEntrega(orden);
  if (!alerta) return null;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILO[alerta.tipo]}`}>
      {textoAlerta(alerta)}
    </span>
  );
}
