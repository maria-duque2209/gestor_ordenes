import { requireRole } from "@/lib/auth";
import { getClientesOpciones, getUsuariosAsignables } from "@/lib/orders";
import { OrdenForm } from "./orden-form";

/** Formulario de nueva orden con sus datos; lo usan la página y el modal. */
export async function NuevaOrden({ enModal = false }: { enModal?: boolean }) {
  await requireRole("admin", "ventas");
  const [clientes, usuarios] = await Promise.all([getClientesOpciones(), getUsuariosAsignables()]);
  return <OrdenForm clientes={clientes} usuarios={usuarios} verPrecio enModal={enModal} />;
}

export function NuevaOrdenSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pb-6" aria-label="Cargando formulario">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 rounded-2xl bg-slate-200/70" />
      ))}
    </div>
  );
}
