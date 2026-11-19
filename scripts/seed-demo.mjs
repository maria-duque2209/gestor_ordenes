// Datos de demostración: un usuario por rol, clientes y algunas órdenes.
// Solo para desarrollo o pruebas, NO en producción.
//   npm run seed:demo
import { admin, upsertUser } from "./_supabase-admin.mjs";

const PASSWORD = "Demo1234!";

const usuarios = [
  { email: "admin@demo.local", nombre: "Ana Admin", rol: "admin" },
  { email: "ventas@demo.local", nombre: "Víctor Ventas", rol: "ventas" },
  { email: "taller1@demo.local", nombre: "Tomás Taller", rol: "taller" },
  { email: "taller2@demo.local", nombre: "Teresa Taller", rol: "taller" },
];

const ids = {};
for (const u of usuarios) {
  ids[u.email] = await upsertUser({ ...u, password: PASSWORD });
  console.log(`Usuario ${u.rol.padEnd(6)} ${u.email}`);
}

const clientesDemo = [
  { nombre: "Audio Car Center", documento: "900123456-1", telefono: "3001234567" },
  { nombre: "Sonido Profesional SAS", documento: "901987654-2", telefono: "3109876543" },
  { nombre: "Juan Pérez", documento: "1020304050", telefono: "3204567890" },
];

const clientes = [];
for (const c of clientesDemo) {
  const { data: found } = await admin.from("clients").select("id").eq("documento", c.documento).maybeSingle();
  if (found) {
    clientes.push(found.id);
  } else {
    const { data, error } = await admin.from("clients").insert(c).select("id").single();
    if (error) throw error;
    clientes.push(data.id);
  }
}
console.log(`Clientes: ${clientes.length}`);

const { count } = await admin.from("orders").select("id", { count: "exact", head: true });
if ((count ?? 0) > 0) {
  console.log(`Ya existen ${count} órdenes; no se crean órdenes de ejemplo.`);
  process.exit(0);
}

const dia = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

const ordenes = [
  {
    client_id: clientes[0],
    tipo_producto: "subwoofer",
    descripcion: 'Cajón sellado para subwoofer de 12"',
    alto: 40, ancho: 60, profundidad: 35, unidad: "cm",
    color: "Negro", material: "MDF 18 mm con alfombra",
    especificaciones: { potencia: "500 W RMS", impedancia: "4 Ω", tamano_driver: '12"', tipo_caja: "Sellada" },
    prioridad: "alta", fecha_inicio: dia(-5), fecha_entrega: dia(-1), estado: "en_produccion",
    precio: 850000, anticipo: 300000,
    responsables: ["taller1@demo.local"],
  },
  {
    client_id: clientes[1],
    tipo_producto: "altavoz",
    descripcion: "Par de columnas 3 vías",
    alto: 110, ancho: 30, profundidad: 35, unidad: "cm",
    color: "Nogal", material: "Enchapado en madera natural",
    especificaciones: { potencia: "150 W", impedancia: "8 Ω", tamano_driver: '8" + 5" + 1"', tipo_caja: "Bass reflex" },
    prioridad: "normal", fecha_inicio: dia(-2), fecha_entrega: dia(2), estado: "pendiente",
    precio: 2400000, anticipo: 1200000,
    responsables: ["taller1@demo.local", "taller2@demo.local"],
  },
  {
    client_id: clientes[2],
    tipo_producto: "subwoofer",
    descripcion: "Caja ported para camioneta",
    alto: 38, ancho: 80, profundidad: 45, unidad: "cm",
    color: "Gris", material: "MDF con pintura texturizada",
    especificaciones: { potencia: "1000 W RMS", impedancia: "2 Ω", tamano_driver: '2 x 10"', tipo_caja: "Ported 35 Hz" },
    prioridad: "urgente", fecha_inicio: dia(0), fecha_entrega: dia(10), estado: "pendiente",
    precio: 1350000, anticipo: 0,
    responsables: ["taller2@demo.local"],
  },
];

for (const { responsables, estado, precio, anticipo, ...orden } of ordenes) {
  const { data, error } = await admin
    .from("orders")
    .insert({ ...orden, created_by: ids["ventas@demo.local"] })
    .select("id, numero")
    .single();
  if (error) throw error;

  const { error: aError } = await admin
    .from("order_assignees")
    .insert(responsables.map((email) => ({ order_id: data.id, user_id: ids[email] })));
  if (aError) throw aError;

  const { error: pError } = await admin.from("order_pricing").insert({ order_id: data.id, precio, anticipo });
  if (pError) throw pError;

  if (estado !== "pendiente") {
    const { error: eError } = await admin.from("orders").update({ estado }).eq("id", data.id);
    if (eError) throw eError;
  }
  console.log(`Orden ${data.numero}`);
}

console.log(`\nListo. Contraseña de todos los usuarios demo: ${PASSWORD}`);
