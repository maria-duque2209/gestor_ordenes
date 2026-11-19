// Comprueba los permisos (RLS) contra el proyecto Supabase real, iniciando
// sesión con los usuarios demo. Requiere haber ejecutado `npm run seed:demo`.
//   npm run verificar
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "Demo1234!";

let fallos = 0;
function check(ok, texto) {
  console.log(`${ok ? "✔" : "✖"} ${texto}`);
  if (!ok) fallos++;
}

async function sesion(email) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`No se pudo iniciar sesión como ${email}: ${error.message}`);
  return sb;
}

const anon = createClient(url, key, { auth: { persistSession: false } });
const { data: anonOrders } = await anon.from("orders").select("id");
check((anonOrders ?? []).length === 0, "Sin sesión no se ve ninguna orden");

const admin = await sesion("admin@demo.local");
const ventas = await sesion("ventas@demo.local");
const taller1 = await sesion("taller1@demo.local");

const { data: todas } = await admin.from("orders").select("id, numero");
check(todas?.length >= 3, `Admin ve todas las órdenes (${todas?.length})`);

const { data: ordVentas } = await ventas.from("orders").select("id");
check(ordVentas?.length === todas?.length, "Ventas ve todas las órdenes");

const { data: precioVentas } = await ventas.from("order_pricing").select("order_id");
check(precioVentas?.length >= 3, "Ventas ve los precios");

const { data: ordTaller } = await taller1.from("orders").select("numero");
check(
  ordTaller?.length > 0 && ordTaller.length < todas.length,
  `Taller 1 solo ve sus órdenes asignadas (${ordTaller?.map((o) => o.numero).join(", ")})`,
);

const { data: precioTaller } = await taller1.from("order_pricing").select("order_id");
check((precioTaller ?? []).length === 0, "Taller no ve precios");

const { error: errCliente } = await taller1.from("clients").insert({ nombre: "No permitido" });
check(!!errCliente, "Taller no puede crear clientes");

const { data: perfilesEditados } = await taller1.from("profiles").update({ rol: "admin" }).neq("id", "x").select("id");
check((perfilesEditados ?? []).length === 0, "Taller no puede cambiar roles");

const { error: errCancel } = await ventas.rpc("cambiar_estado_orden", {
  p_order_id: todas[0].id,
  p_estado: "cancelada",
});
check(!!errCancel, "Ventas no puede cancelar órdenes");

const { data: buckets } = await admin.storage.from("order-photos").list("", { limit: 1 });
check(Array.isArray(buckets), "El bucket de fotos existe y es accesible");

console.log(fallos ? `\n${fallos} comprobación(es) fallida(s).` : "\nTodas las comprobaciones pasaron.");
process.exit(fallos ? 1 : 0);
