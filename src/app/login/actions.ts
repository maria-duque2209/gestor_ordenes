"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
  email?: string;
}

function destinoSeguro(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Solo rutas internas, para evitar redirecciones abiertas.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu email y tu contraseña.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Email o contraseña incorrectos.", email };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("activo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.activo) {
    await supabase.auth.signOut();
    return { error: "Tu usuario está desactivado. Contacta con el administrador.", email };
  }

  redirect(destinoSeguro(formData.get("next")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
