"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";

export async function guardarConfiguracion(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const tallerVerTodas = formData.get("taller_ver_todas") === "todas";

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("app_settings")
    .update({ valor: tallerVerTodas, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("clave", "taller_ver_todas");

  if (error || !count) return { error: `No se pudo guardar: ${error?.message ?? "sin permiso"}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Configuración guardada." };
}
