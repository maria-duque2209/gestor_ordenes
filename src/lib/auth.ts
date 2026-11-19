import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Rol } from "@/lib/types";

export type CurrentUser = Pick<Profile, "id" | "nombre" | "email" | "rol">;

/**
 * Usuario actual con su perfil. Se resuelve una vez por petición.
 * Lee cookies, así que debe llamarse dentro de un <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nombre, email, rol, activo")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.activo) {
    await supabase.auth.signOut();
    redirect("/login?error=inactivo");
  }

  return { id: profile.id, nombre: profile.nombre, email: profile.email, rol: profile.rol as Rol };
});

/** Exige uno de los roles indicados; si no, vuelve al inicio. */
export async function requireRole(...roles: Rol[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!roles.includes(user.rol)) redirect("/?error=sin_permiso");
  return user;
}
