import { getCurrentUser } from "@/lib/auth";
import { buscarHistorial, leerFiltrosHistorial, type FilaHistorial } from "@/lib/historial";
import { hoyISO } from "@/lib/format";
import { ESTADO_LABEL, PRIORIDAD_LABEL, TIPO_PRODUCTO_LABEL } from "@/lib/labels";

/** Supabase limita cada respuesta (1000 filas por defecto): se pide por bloques. */
const BLOQUE = 1000;
const MAX_FILAS = 20000;

/**
 * Exporta el historial filtrado como CSV para Excel: separador «;» y BOM UTF-8,
 * que es lo que espera Excel con configuración regional de Colombia/España.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const f = leerFiltrosHistorial(sp);

  const filas: FilaHistorial[] = [];
  let conPrecio = false;
  for (let desde = 0; desde < MAX_FILAS; desde += BLOQUE) {
    const r = await buscarHistorial(f, user, { desde, hasta: desde + BLOQUE - 1 });
    conPrecio = r.conPrecio;
    filas.push(...r.filas);
    if (r.filas.length < BLOQUE || filas.length >= r.total) break;
  }

  const cabecera = [
    "Número",
    "Cliente",
    "Documento",
    "Producto",
    "Descripción",
    "Estado",
    "Prioridad",
    "Fecha de entrega",
    "Creada",
    "Último cambio",
    ...(conPrecio ? ["Precio", "Anticipo", "Saldo"] : []),
  ];

  const dinero = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(Math.round(Number(v))));
  const lineas = filas.map((o) =>
    [
      o.numero,
      o.cliente?.nombre ?? "",
      o.cliente?.documento ?? "",
      TIPO_PRODUCTO_LABEL[o.tipo_producto],
      o.descripcion ?? "",
      ESTADO_LABEL[o.estado],
      PRIORIDAD_LABEL[o.prioridad],
      o.fecha_entrega ?? "",
      o.created_at.slice(0, 10),
      o.updated_at.slice(0, 10),
      ...(conPrecio ? [dinero(o.precio?.precio), dinero(o.precio?.anticipo), dinero(o.precio?.saldo)] : []),
    ]
      .map(celda)
      .join(";"),
  );

  const csv = "﻿" + [cabecera.map(celda).join(";"), ...lineas].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historial-${hoyISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Escapa una celda CSV y neutraliza fórmulas (=, +, -, @) para evitar inyección en Excel. */
function celda(valor: string): string {
  let v = valor.replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(v)) v = `'${v}`;
  return /[";]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
