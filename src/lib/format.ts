const fechaFmt = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const fechaHoraFmt = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});
const monedaFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const ZONA_HORARIA = "America/Bogota";

/** Fecha de hoy en Colombia como 'YYYY-MM-DD' (el servidor puede estar en UTC). */
export function hoyISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
}

/** Días desde hoy hasta una fecha 'YYYY-MM-DD' (negativo = ya pasó). */
export function diasHasta(fecha: string): number {
  const aUTC = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((aUTC(fecha) - aUTC(hoyISO())) / 86400000);
}

/** Fecha 'YYYY-MM-DD' (sin zona horaria) → '05 nov 2026'. */
export function formatFecha(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return fechaFmt.format(new Date(y, m - 1, d));
}

export function formatFechaHora(value: string | null | undefined): string {
  if (!value) return "—";
  return fechaHoraFmt.format(new Date(value));
}

export function formatMoneda(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return monedaFmt.format(Number(value));
}
