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
