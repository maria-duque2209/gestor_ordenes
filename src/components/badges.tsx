import { ESTADO_LABEL, PRIORIDAD_LABEL, ROL_LABEL } from "@/lib/labels";
import type { EstadoOrden, Prioridad, Rol } from "@/lib/types";

const PRIORIDAD_STYLE: Record<Prioridad, string> = {
  baja: "bg-slate-100 text-slate-600",
  normal: "bg-slate-100 text-slate-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-600 text-white",
};

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDAD_STYLE[prioridad]}`}>
      {PRIORIDAD_LABEL[prioridad]}
    </span>
  );
}

const ESTADO_STYLE: Record<EstadoOrden, string> = {
  pendiente: "bg-slate-100 text-slate-700",
  en_produccion: "bg-sky-100 text-sky-800",
  control_calidad: "bg-violet-100 text-violet-800",
  terminada: "bg-emerald-100 text-emerald-800",
  entregada: "bg-emerald-600 text-white",
  cancelada: "bg-red-100 text-red-700 line-through",
};

export function EstadoBadge({ estado }: { estado: EstadoOrden }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_STYLE[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}

const ROL_STYLE: Record<Rol, string> = {
  admin: "bg-violet-100 text-violet-800",
  ventas: "bg-sky-100 text-sky-800",
  taller: "bg-amber-100 text-amber-900",
};

export function RolBadge({ rol }: { rol: Rol }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROL_STYLE[rol]}`}>
      {ROL_LABEL[rol]}
    </span>
  );
}

export function ActivoBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Activo
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
      Inactivo
    </span>
  );
}
