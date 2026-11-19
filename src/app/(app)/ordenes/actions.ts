"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { optionalText, parseForm, type FormState } from "@/lib/forms";
import { BUCKET_FOTOS } from "@/lib/photos-constants";

export interface GuardarOrdenResult extends FormState {
  id?: string;
  numero?: string;
}

/** Medida opcional: acepta coma o punto decimal; vacío → null. */
const medida = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Debe ser un número mayor que 0" });
      return z.NEVER;
    }
    return n;
  });

/** Importe en pesos: se ignoran puntos, espacios y el símbolo $. Vacío → null. */
const importe = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const limpio = v.replace(/[$\s.]/g, "").replace(",", ".");
    const n = Number(limpio);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Importe no válido" });
      return z.NEVER;
    }
    return Math.round(n);
  });

const fecha = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida");

const ordenSchema = z
  .object({
    modo_cliente: z.enum(["existente", "nuevo"]),
    client_id: z.string().optional(),
    cliente_nombre: z.string().trim().max(200).optional(),
    cliente_documento: optionalText(50),
    cliente_telefono: optionalText(50),
    cliente_email: optionalText(200),
    tipo_producto: z.enum(["subwoofer", "altavoz", "otro"], { error: "Elige el tipo de producto" }),
    descripcion: optionalText(2000),
    alto: medida,
    ancho: medida,
    profundidad: medida,
    unidad: z.enum(["cm", "mm", "in"]),
    color: optionalText(100),
    material: optionalText(200),
    spec_potencia: optionalText(100),
    spec_impedancia: optionalText(100),
    spec_tamano_driver: optionalText(100),
    spec_tipo_caja: optionalText(100),
    notas_especificaciones: optionalText(2000),
    prioridad: z.enum(["baja", "normal", "alta", "urgente"]),
    fecha_inicio: fecha,
    fecha_entrega: fecha,
    precio: importe,
    anticipo: importe,
  })
  .superRefine((v, ctx) => {
    if (v.modo_cliente === "existente" && !z.uuid().safeParse(v.client_id).success) {
      ctx.addIssue({ code: "custom", path: ["client_id"], message: "Selecciona un cliente" });
    }
    if (v.modo_cliente === "nuevo" && !v.cliente_nombre) {
      ctx.addIssue({ code: "custom", path: ["cliente_nombre"], message: "Escribe el nombre del cliente" });
    }
    if (v.modo_cliente === "nuevo" && v.cliente_email && !z.email().safeParse(v.cliente_email).success) {
      ctx.addIssue({ code: "custom", path: ["cliente_email"], message: "Email no válido" });
    }
    if (v.fecha_inicio && v.fecha_entrega && v.fecha_entrega < v.fecha_inicio) {
      ctx.addIssue({ code: "custom", path: ["fecha_entrega"], message: "La entrega no puede ser antes del inicio" });
    }
    if ((v.anticipo ?? 0) > 0 && v.precio === null) {
      ctx.addIssue({ code: "custom", path: ["precio"], message: "Indica el precio si hay anticipo" });
    }
    if (v.precio !== null && (v.anticipo ?? 0) > v.precio) {
      ctx.addIssue({ code: "custom", path: ["anticipo"], message: "El anticipo no puede superar el precio" });
    }
  });

export async function guardarOrden(orderId: string | null, formData: FormData): Promise<GuardarOrdenResult> {
  await requireRole("admin", "ventas");
  const parsed = parseForm(ordenSchema, formData);
  if (parsed.state) return parsed.state;
  const v = parsed.data;

  const responsables = formData
    .getAll("responsables")
    .map(String)
    .filter((id) => z.uuid().safeParse(id).success);

  const especificaciones = Object.fromEntries(
    (
      [
        ["potencia", v.spec_potencia],
        ["impedancia", v.spec_impedancia],
        ["tamano_driver", v.spec_tamano_driver],
        ["tipo_caja", v.spec_tipo_caja],
      ] as const
    ).filter(([, val]) => val),
  );

  const orden = {
    client_id: v.modo_cliente === "existente" ? v.client_id : null,
    tipo_producto: v.tipo_producto,
    descripcion: v.descripcion,
    alto: v.alto,
    ancho: v.ancho,
    profundidad: v.profundidad,
    unidad: v.unidad,
    color: v.color,
    material: v.material,
    especificaciones,
    notas_especificaciones: v.notas_especificaciones,
    prioridad: v.prioridad,
    fecha_inicio: v.fecha_inicio,
    fecha_entrega: v.fecha_entrega,
  };

  const clienteNuevo =
    v.modo_cliente === "nuevo"
      ? {
          nombre: v.cliente_nombre,
          documento: v.cliente_documento,
          telefono: v.cliente_telefono,
          email: v.cliente_email,
        }
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guardar_orden", {
    p_order_id: orderId,
    p_orden: orden,
    p_responsables: responsables,
    p_cliente_nuevo: clienteNuevo,
    // Precio vacío = no se toca (para dejarlo a cero, escribe 0).
    p_precio: v.precio,
    p_anticipo: v.anticipo ?? 0,
  });

  if (error) {
    if (error.code === "23505" && /documento/.test(error.message)) {
      return {
        error: "Ya existe un cliente con ese documento/NIT. Selecciónalo en «Cliente existente».",
        fieldErrors: { cliente_documento: ["Documento ya registrado"] },
      };
    }
    if (error.code === "42501") return { error: "No tienes permiso para guardar órdenes." };
    return { error: `No se pudo guardar la orden: ${error.message}` };
  }

  const res = data as { id: string; numero: string };
  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${res.id}`);
  return { ok: true, id: res.id, numero: res.numero };
}

export async function eliminarFoto(photoId: string): Promise<FormState> {
  await getCurrentUser();
  const supabase = await createClient();

  const { data: foto, error } = await supabase
    .from("order_photos")
    .delete()
    .eq("id", photoId)
    .select("order_id, storage_path")
    .maybeSingle();

  if (error) return { error: `No se pudo eliminar la foto: ${error.message}` };
  if (!foto) return { error: "No tienes permiso para eliminar esta foto." };

  await supabase.storage.from(BUCKET_FOTOS).remove([foto.storage_path]);
  revalidatePath(`/ordenes/${foto.order_id}`);
  return { ok: true };
}
