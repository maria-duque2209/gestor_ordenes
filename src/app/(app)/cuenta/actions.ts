"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/forms";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
    confirmacion: z.string(),
  })
  .refine((v) => v.password === v.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden",
  });

export async function cambiarContrasena(_prev: FormState, formData: FormData): Promise<FormState> {
  await getCurrentUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const msg = /different from the old/i.test(error.message)
      ? "La nueva contraseña debe ser distinta de la actual."
      : `No se pudo cambiar la contraseña: ${error.message}`;
    return { error: msg };
  }
  return { ok: true, message: "Contraseña actualizada." };
}
