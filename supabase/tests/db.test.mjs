// Prueba de las migraciones con PGlite (Postgres en WASM), sin Docker.
// Simula lo mínimo de Supabase (roles, auth.uid(), auth.users, storage) y
// comprueba numeración, historial y permisos por rol.
//   npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema storage;
  grant usage on schema auth, storage to anon, authenticated, service_role;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_app_meta_data jsonb default '{}'::jsonb,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create table storage.buckets (
    id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner_id text
  );
  alter table storage.objects enable row level security;
  grant select, insert, update, delete on storage.objects to authenticated;
`;

const USERS = {
  admin: "00000000-0000-0000-0000-00000000000a",
  ventas: "00000000-0000-0000-0000-00000000000b",
  taller1: "00000000-0000-0000-0000-00000000000c",
  taller2: "00000000-0000-0000-0000-00000000000d",
};

async function setup() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(root, "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`Migración ${file}: ${e.message} (pos ${e.position ?? "?"}) ${e.where ?? ""}`);
    }
  }
  for (const [name, id] of Object.entries(USERS)) {
    const rol = name.replace(/\d$/, "");
    await db.query(
      `insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
       values ($1, $2, $3, $4)`,
      [id, `${name}@test.local`, { rol }, { nombre: name }],
    );
  }
  return db;
}

/** Ejecuta fn como un usuario autenticado dentro de una transacción. */
async function as(db, userKey, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [USERS[userKey]]);
    await tx.exec("set local role authenticated");
    return fn(tx);
  });
}

async function rejects(promise, pattern) {
  await assert.rejects(promise, pattern);
}

const db = await setup();
let clientId;
let orderA; // asignada a taller1
let orderB; // sin asignar

test("el trigger crea perfiles con el rol de app_metadata", async () => {
  const { rows } = await db.query(`select email, rol, nombre from public.profiles order by email`);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((r) => r.rol),
    ["admin", "taller", "taller", "ventas"],
  );
});

test("un usuario no puede auto-asignarse rol con user_metadata", async () => {
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'x@test.local', '{"rol":"admin"}')`,
  );
  const { rows } = await db.query(`select rol, activo from public.profiles where email = 'x@test.local'`);
  assert.equal(rows[0].rol, "taller");
  assert.equal(rows[0].activo, false, "un registro por cuenta propia queda inactivo");
});

test("ventas crea cliente y órdenes con numeración consecutiva", async () => {
  await as(db, "ventas", async (tx) => {
    const c = await tx.query(`insert into public.clients (nombre) values ('Cliente Uno') returning id`);
    clientId = c.rows[0].id;
    const a = await tx.query(
      `insert into public.orders (client_id, tipo_producto, numero, numero_seq)
       values ($1, 'subwoofer', 'OP-9999', 9999) returning id, numero, created_by`,
      [clientId],
    );
    const b = await tx.query(
      `insert into public.orders (client_id, tipo_producto) values ($1, 'altavoz') returning id, numero`,
      [clientId],
    );
    orderA = a.rows[0].id;
    orderB = b.rows[0].id;
    assert.equal(a.rows[0].numero, "OP-0001", "ignora el número enviado a mano");
    assert.equal(a.rows[0].created_by, USERS.ventas);
    assert.equal(b.rows[0].numero, "OP-0002");
    await tx.query(`insert into public.order_assignees (order_id, user_id) values ($1, $2)`, [
      orderA,
      USERS.taller1,
    ]);
  });
});

test("los usuarios no pueden consumir números de la secuencia", async () => {
  await rejects(
    as(db, "admin", (tx) => tx.query(`select nextval('public.orders_numero_seq')`)),
    /permission denied/,
  );
});

test("el número de orden no se puede modificar", async () => {
  await rejects(
    as(db, "admin", (tx) => tx.query(`update public.orders set numero = 'OP-0500' where id = $1`, [orderA])),
    /no se puede modificar/,
  );
});

test("a partir de 10000 el número crece sin truncarse", async () => {
  const fresh = await setup();
  await fresh.query(`select setval('public.orders_numero_seq', 9999)`);
  const numero = await as(fresh, "ventas", async (tx) => {
    const c = await tx.query(`insert into public.clients (nombre) values ('C') returning id`);
    const o = await tx.query(
      `insert into public.orders (client_id, tipo_producto) values ($1, 'otro') returning numero`,
      [c.rows[0].id],
    );
    return o.rows[0].numero;
  });
  assert.equal(numero, "OP-10000");
  await fresh.close();
});

test("taller solo ve las órdenes asignadas (configuración por defecto)", async () => {
  const ids = await as(db, "taller1", async (tx) => (await tx.query(`select id from public.orders`)).rows);
  assert.deepEqual(ids.map((r) => r.id), [orderA]);
  const otro = await as(db, "taller2", async (tx) => (await tx.query(`select id from public.orders`)).rows);
  assert.equal(otro.length, 0);
});

test("con taller_ver_todas = true, taller ve todas", async () => {
  await as(db, "admin", (tx) =>
    tx.query(`update public.app_settings set valor = 'true' where clave = 'taller_ver_todas'`),
  );
  const ids = await as(db, "taller2", async (tx) => (await tx.query(`select id from public.orders`)).rows);
  assert.equal(ids.length, 2);
  await as(db, "admin", (tx) =>
    tx.query(`update public.app_settings set valor = 'false' where clave = 'taller_ver_todas'`),
  );
});

test("ventas no puede cambiar la configuración", async () => {
  const r = await as(db, "ventas", (tx) =>
    tx.query(`update public.app_settings set valor = 'true' where clave = 'taller_ver_todas'`),
  );
  assert.equal(r.affectedRows, 0);
});

test("taller no puede crear ni editar clientes", async () => {
  await rejects(
    as(db, "taller1", (tx) => tx.query(`insert into public.clients (nombre) values ('X')`)),
    /row-level security/,
  );
  const r = await as(db, "taller1", (tx) =>
    tx.query(`update public.clients set nombre = 'Hack' where id = $1`, [clientId]),
  );
  assert.equal(r.affectedRows, 0);
});

test("taller no puede editar la orden directamente", async () => {
  const r = await as(db, "taller1", (tx) =>
    tx.query(`update public.orders set color = 'rojo' where id = $1`, [orderA]),
  );
  assert.equal(r.affectedRows, 0);
});

test("taller no puede gestionar usuarios", async () => {
  const r = await as(db, "taller1", (tx) =>
    tx.query(`update public.profiles set rol = 'admin' where id = $1`, [USERS.taller1]),
  );
  assert.equal(r.affectedRows, 0);
});

test("taller cambia el estado de su orden y queda en el historial", async () => {
  await as(db, "taller1", (tx) =>
    tx.query(`select public.cambiar_estado_orden($1, 'en_produccion', 'Iniciado corte')`, [orderA]),
  );
  const { rows } = await db.query(
    `select accion, user_id, cambio from public.order_history where order_id = $1 order by id`,
    [orderA],
  );
  const cambio = rows.find((r) => r.accion === "cambio_estado");
  assert.ok(cambio, "existe el registro de cambio de estado");
  assert.equal(cambio.user_id, USERS.taller1);
  assert.deepEqual(cambio.cambio, { antes: "pendiente", despues: "en_produccion" });
  assert.ok(rows.some((r) => r.accion === "nota_agregada"));
  assert.ok(rows.some((r) => r.accion === "responsable_asignado"));
  assert.equal(rows[0].accion, "creada");
});

test("taller no puede cambiar el estado de una orden no asignada", async () => {
  await rejects(
    as(db, "taller1", (tx) => tx.query(`select public.cambiar_estado_orden($1, 'terminada')`, [orderB])),
    /No tienes acceso/,
  );
});

test("solo admin puede cancelar", async () => {
  await rejects(
    as(db, "ventas", (tx) => tx.query(`select public.cambiar_estado_orden($1, 'cancelada')`, [orderB])),
    /Solo un administrador/,
  );
  await rejects(
    as(db, "taller1", (tx) => tx.query(`select public.cambiar_estado_orden($1, 'cancelada')`, [orderA])),
    /Solo un administrador/,
  );
  await as(db, "admin", (tx) => tx.query(`select public.cambiar_estado_orden($1, 'cancelada')`, [orderB]));
});

test("ventas no puede borrar órdenes; admin sí", async () => {
  const r = await as(db, "ventas", (tx) => tx.query(`delete from public.orders where id = $1`, [orderB]));
  assert.equal(r.affectedRows, 0);
  const r2 = await as(db, "admin", (tx) => tx.query(`delete from public.orders where id = $1`, [orderB]));
  assert.equal(r2.affectedRows, 1);
});

test("nadie puede escribir el historial a mano", async () => {
  await rejects(
    as(db, "admin", (tx) =>
      tx.query(`insert into public.order_history (order_id, accion) values ($1, 'falso')`, [orderA]),
    ),
    /permission denied/,
  );
});

test("la edición de datos queda en el historial con el detalle del cambio", async () => {
  await as(db, "ventas", (tx) =>
    tx.query(`update public.orders set color = 'negro mate', alto = 50 where id = $1`, [orderA]),
  );
  const { rows } = await db.query(
    `select cambio from public.order_history where order_id = $1 and accion = 'edicion'`,
    [orderA],
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].cambio.color, { antes: null, despues: "negro mate" });
  assert.ok(rows[0].cambio.alto);
});

test("fotos: taller sube en su orden pero no en otras", async () => {
  await as(db, "taller1", async (tx) => {
    await tx.query(
      `insert into storage.objects (bucket_id, name, owner_id) values ('order-photos', $1, $2)`,
      [`${orderA}/a.jpg`, USERS.taller1],
    );
    await tx.query(
      `insert into public.order_photos (order_id, storage_path, uploaded_by) values ($1, $2, $3)`,
      [orderA, `${orderA}/a.jpg`, USERS.taller1],
    );
  });
  await rejects(
    as(db, "taller2", (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name) values ('order-photos', $1)`, [
        `${orderA}/b.jpg`,
      ]),
    ),
    /row-level security/,
  );
});

test("usuarios inactivos no ven nada", async () => {
  await db.query(`update public.profiles set activo = false where id = $1`, [USERS.ventas]);
  const rows = await as(db, "ventas", async (tx) => (await tx.query(`select id from public.orders`)).rows);
  assert.equal(rows.length, 0);
  await db.query(`update public.profiles set activo = true where id = $1`, [USERS.ventas]);
});

test("seed.sql se puede ejecutar varias veces sin duplicar", async () => {
  const fresh = await setup();
  const seed = readFileSync(join(root, "seed.sql"), "utf8");
  await fresh.exec(seed);
  await fresh.exec(seed);
  const { rows } = await fresh.query(`select count(*)::int as n from public.clients`);
  assert.equal(rows[0].n, 3);
  await fresh.close();
});

test("precios: ventas los guarda y el saldo se calcula solo", async () => {
  const row = await as(db, "ventas", async (tx) =>
    (
      await tx.query(
        `insert into public.order_pricing (order_id, precio, anticipo) values ($1, 850000, 300000)
         returning saldo, updated_by`,
        [orderA],
      )
    ).rows[0],
  );
  assert.equal(Number(row.saldo), 550000);
  assert.equal(row.updated_by, USERS.ventas);
  await as(db, "ventas", (tx) =>
    tx.query(`update public.order_pricing set anticipo = 400000 where order_id = $1`, [orderA]),
  );
});

test("precios: el anticipo no puede superar el precio", async () => {
  await rejects(
    as(db, "ventas", (tx) =>
      tx.query(`update public.order_pricing set anticipo = 999999999 where order_id = $1`, [orderA]),
    ),
    /order_pricing_anticipo_chk/,
  );
});

test("precios: taller no los ve ni los modifica, aunque la orden sea suya", async () => {
  const rows = await as(db, "taller1", async (tx) => (await tx.query(`select * from public.order_pricing`)).rows);
  assert.equal(rows.length, 0);
  const r = await as(db, "taller1", (tx) =>
    tx.query(`update public.order_pricing set precio = 1 where order_id = $1`, [orderA]),
  );
  assert.equal(r.affectedRows, 0);
  await rejects(
    as(db, "taller1", (tx) =>
      tx.query(`insert into public.order_pricing (order_id, precio) values ($1, 1)
                on conflict (order_id) do nothing`, [orderA]),
    ),
    /row-level security/,
  );
});

test("precios: el historial los registra, pero el taller no ve esas entradas", async () => {
  const ventas = await as(db, "ventas", async (tx) =>
    (await tx.query(
      `select cambio from public.order_history where order_id = $1 and accion = 'precio_actualizado' order by id`,
      [orderA],
    )).rows,
  );
  assert.equal(ventas.length, 2);
  assert.deepEqual(ventas[1].cambio.anticipo, { antes: 300000, despues: 400000 });

  const taller = await as(db, "taller1", async (tx) =>
    (await tx.query(`select accion from public.order_history where order_id = $1`, [orderA])).rows,
  );
  assert.ok(taller.length > 0, "el taller sí ve el resto del historial");
  assert.ok(!taller.some((r) => r.accion === "precio_actualizado"));
});

test("clientes: no se repite el documento, aunque cambie el formato", async () => {
  await as(db, "ventas", (tx) =>
    tx.query(`insert into public.clients (nombre, documento) values ('Dup A', '800.555.111-2')`),
  );
  await rejects(
    as(db, "ventas", (tx) =>
      tx.query(`insert into public.clients (nombre, documento) values ('Dup B', ' 8005551112 ')`),
    ),
    /clients_documento_unico/,
  );
  // Sin documento sí se permiten varios
  await as(db, "ventas", (tx) =>
    tx.query(`insert into public.clients (nombre, documento) values ('Sin doc 1', null), ('Sin doc 2', '')`),
  );
});
