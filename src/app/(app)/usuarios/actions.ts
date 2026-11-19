"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { parseForm, type FormState } from "@/lib/forms";

const rol = z.enum(["admin", "ventas", "taller"], { error: "Elige un rol" });
const password = z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres");

const crearSchema = z
  .object({
    nombre: z.string().trim().min(1, "Escribe el nombre").max(120),
    email: z.email("Email no válido").trim().toLowerCase(),
    rol,
    modo: z.enum(["invitar", "contrasena"]),
    password: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.modo === "contrasena") {
      const r = password.safeParse(v.password ?? "");
      if (!r.success) ctx.addIssue({ code: "custom", path: ["password"], message: r.error.issues[0].message });
    }
  });

/** Ban "indefinido" de Supabase Auth para usuarios desactivados. */
const BAN_INDEFINIDO = "876000h";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function mensajeAuth(message: string) {
  if (/already|registered|exists/i.test(message)) return "Ya existe un usuario con ese email.";
  if (/rate limit/i.test(message))
    return "Se alcanzó el límite de emails de Supabase. Espera un rato o crea el usuario con contraseña temporal.";
  return `No se pudo crear el usuario: ${message}`;
}

export async function crearUsuario(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const parsed = parseForm(crearSchema, formData);
  if (parsed.state) return parsed.state;
  const { nombre, email, rol, modo } = parsed.data;
  const values = Object.fromEntries([...formData.entries()].filter(([k]) => k !== "password")) as Record<string, string>;

  const admin = createAdminClient();
  let userId: string | undefined;

  if (modo === "invitar") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre },
      redirectTo: `${await siteUrl()}/auth/confirm?next=/cuenta`,
    });
    if (error) return { error: mensajeAuth(error.message), values };
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password!,
      email_confirm: true,
      user_metadata: { nombre },
      app_metadata: { rol },
    });
    if (error) return { error: mensajeAuth(error.message), values };
    userId = data.user.id;
  }

  // El rol se guarda en app_metadata (no editable por el usuario) y en el perfil.
  await admin.auth.admin.updateUserById(userId, { app_metadata: { rol } });
  const { error: profileError } = await admin
    .from("profiles")
    .update({ nombre, rol, activo: true })
    .eq("id", userId);
  if (profileError) return { error: `Usuario creado, pero no se pudo guardar el perfil: ${profileError.message}` };

  revalidatePath("/usuarios");
  redirect(`/usuarios?creado=${modo}`);
}

const actualizarSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre").max(120),
  rol,
  activo: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function actualizarUsuario(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const yo = await requireRole("admin");
  const parsed = parseForm(actualizarSchema, formData);
  if (parsed.state) return parsed.state;
  const { nombre, rol, activo } = parsed.data;

  if (userId === yo.id && (rol !== "admin" || !activo)) {
    return {
      error: "No puedes quitarte el rol de administrador ni desactivarte a ti mismo.",
      values: Object.fromEntries(formData) as Record<string, string>,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ nombre, rol, activo }).eq("id", userId);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // Mantener Auth en sintonía: rol en app_metadata y bloqueo de acceso si está inactivo.
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { rol },
    user_metadata: { nombre },
    ban_duration: activo ? "none" : BAN_INDEFINIDO,
  });
  if (authError) return { error: `Perfil guardado, pero falló la actualización en Auth: ${authError.message}` };

  revalidatePath("/usuarios");
  return { ok: true, message: "Cambios guardados." };
}

export async function restablecerContrasena(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");
  const r = password.safeParse(String(formData.get("password") ?? ""));
  if (!r.success) return { fieldErrors: { password: [r.error.issues[0].message] } };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: r.data });
  if (error) return { error: `No se pudo cambiar la contraseña: ${error.message}` };
  return { ok: true, message: "Contraseña actualizada. Comunícasela al usuario por un medio seguro." };
}
