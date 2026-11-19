// Crea el primer administrador (o convierte en admin a un usuario existente).
//   npm run crear-admin -- <email> <contraseña> "<nombre>"
import { upsertUser } from "./_supabase-admin.mjs";

const [email, password, nombre = "Administrador"] = process.argv.slice(2);

if (!email || !password) {
  console.error('Uso: npm run crear-admin -- <email> <contraseña> "<nombre>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

try {
  await upsertUser({ email, password, nombre, rol: "admin" });
  console.log(`Administrador listo: ${email}`);
} catch (e) {
  console.error("No se pudo crear el administrador:", e.message ?? e);
  process.exit(1);
}
