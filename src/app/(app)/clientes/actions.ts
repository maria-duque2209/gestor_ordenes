"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formValues, optionalText, parseForm, type FormState } from "@/lib/forms";

const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre o razón social").max(200),
  documento: optionalText(50),
  telefono: optionalText(50),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Email no válido")
    .transform((v) => (v === "" ? null : v))
    .optional()
    .transform((v) => v ?? null),
  direccion: optionalText(300),
  notas: optionalText(2000),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

export async function guardarCliente(
  clienteId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin", "ventas");
  const parsed = parseForm(clienteSchema, formData);
  if (parsed.state) return parsed.state;

  const supabase = await createClient();
  const query = clienteId
    ? supabase.from("clients").update(parsed.data).eq("id", clienteId).select("id").single()
    : supabase.from("clients").insert(parsed.data).select("id").single();
  const { data, error } = await query;

  if (error?.code === "23505") {
    const normalizado = (parsed.data.documento ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    const { data: existente } = await supabase
      .from("clients")
      .select("id, nombre")
      .eq("documento_normalizado", normalizado)
      .maybeSingle();
    return {
      error: "Ya existe un cliente con ese documento/NIT.",
      fieldErrors: {
        documento: [existente ? `Ya lo tiene «${existente.nombre}».` : "Este documento ya está registrado."],
      },
      duplicadoId: existente?.id,
      values: formValues(formData),
    };
  }

  if (error || !data) {
    return {
      error: `No se pudo guardar el cliente: ${error?.message ?? "sin respuesta"}`,
      values: formValues(formData),
    };
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}?guardado=1`);
}

export async function eliminarCliente(clienteId: string): Promise<FormState> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error, count } = await supabase.from("clients").delete({ count: "exact" }).eq("id", clienteId);

  if (error) {
    if (error.code === "23503") {
      return { error: "No se puede eliminar: el cliente tiene órdenes. Cancela o elimina primero sus órdenes." };
    }
    return { error: `No se pudo eliminar: ${error.message}` };
  }
  if (!count) return { error: "No se pudo eliminar el cliente (sin permiso o ya no existe)." };

  revalidatePath("/clientes");
  redirect("/clientes?eliminado=1");
}
