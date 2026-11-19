// Cliente administrativo para los scripts de consola (usa .env.local).
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

export const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Crea (o actualiza) un usuario con email confirmado y el rol indicado. */
export async function upsertUser({ email, password, nombre, rol }) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { rol },
    user_metadata: { nombre },
  });

  let userId = created?.user?.id;
  if (error) {
    if (!/already|registered|exists/i.test(error.message)) throw error;
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw error;
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password, app_metadata: { rol } });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ rol, nombre, activo: true })
    .eq("id", userId);
  if (profileError) throw profileError;

  return userId;
}
