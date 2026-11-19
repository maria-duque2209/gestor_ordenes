import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ESTADOS_ACTIVOS } from "@/lib/estados";
import { haceDiasISO } from "@/lib/format";
import { Tablero, type TarjetaOrden } from "./tablero";

export const metadata: Metadata = { title: "Tablero" };

/** Días que una orden entregada sigue visible en el tablero. */
const DIAS_ENTREGADAS = 14;

type Fila = Omit<TarjetaOrden, "responsables" | "cliente"> & {
  cliente: { nombre: string } | null;
  asignaciones: { user_id: string; usuario: { nombre: string } | null }[];
};

export default async function TableroPage({ searchParams }: PageProps<"/tablero">) {
  const user = await getCurrentUser();
  const { mias } = await searchParams;
  const soloMias = mias === "1";
  const supabase = await createClient();

  const desde = haceDiasISO(DIAS_ENTREGADAS);
  const select = `id, numero, tipo_producto, descripcion, estado, prioridad, fecha_entrega,
     cliente:clients (nombre),
     asignaciones:order_assignees (user_id, usuario:profiles (nombre))
     ${soloMias ? ", mia:order_assignees!inner (user_id)" : ""}`;

  let activas = supabase.from("orders").select(select).in("estado", ESTADOS_ACTIVOS);
  let entregadas = supabase.from("orders").select(select).eq("estado", "entregada").gte("updated_at", desde);
  if (soloMias) {
    activas = activas.eq("mia.user_id", user.id);
    entregadas = entregadas.eq("mia.user_id", user.id);
  }

  const [a, e] = await Promise.all([activas.returns<Fila[]>(), entregadas.returns<Fila[]>()]);
  if (a.error) throw new Error(a.error.message);
  if (e.error) throw new Error(e.error.message);

  const tarjetas: TarjetaOrden[] = [...(a.data ?? []), ...(e.data ?? [])].map((o) => ({
    id: o.id,
    numero: o.numero,
    tipo_producto: o.tipo_producto,
    descripcion: o.descripcion,
    estado: o.estado,
    prioridad: o.prioridad,
    fecha_entrega: o.fecha_entrega,
    cliente: o.cliente?.nombre ?? "",
    responsables: o.asignaciones.map((x) => x.usuario?.nombre ?? "").filter(Boolean),
  }));

  return (
    <>
      <PageHeader
        title="Tablero"
        description={`Arrastra las tarjetas (o usa «Mover a…») para cambiar el estado. Las entregadas se muestran ${DIAS_ENTREGADAS} días.`}
        actions={
          <Link href={soloMias ? "/tablero" : "/tablero?mias=1"} className="btn-secondary">
            {soloMias ? "Ver todas" : "Solo mis órdenes"}
          </Link>
        }
      />
      <Tablero tarjetas={tarjetas} rol={user.rol} />
    </>
  );
}
